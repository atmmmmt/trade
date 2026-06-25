import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { StrategySignal, TradingSide } from '../trading/types.js';

export type PaperPosition = {
  id: string;
  symbol: string;
  side: TradingSide;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  size: number;
  openedAt: string;
  status: 'OPEN' | 'CLOSED';
  exitPrice?: number;
  closedAt?: string;
  pnl?: number;
  grossPnl?: number;
  entryFee?: number;
  exitFee?: number;
  closeReason?: string;
};

export type PaperAccount = {
  balance: number;
  startingBalance: number;
  positions: PaperPosition[];
};

export type PaperRiskSettings = {
  riskPercent: number;
  maxPositionNotional: number;
  commissionRate: number;
  slippageRate: number;
  maxLossAmount: number;
};

const dataDir = path.resolve(process.cwd(), 'data');
const accountPath = path.join(dataDir, 'paper-account.json');
const settingsPath = path.join(dataDir, 'paper-risk-settings.json');

const defaultSettings: PaperRiskSettings = {
  riskPercent: 1,
  maxPositionNotional: 100,
  commissionRate: 0.0004,
  slippageRate: 0.0002,
  maxLossAmount: 50
};

const account: PaperAccount = loadAccount();
let riskSettings: PaperRiskSettings = loadRiskSettings();

export function getPaperAccount(): PaperAccount {
  return account;
}

export function getPaperRiskSettings(): PaperRiskSettings {
  return riskSettings;
}

export function updatePaperRiskSettings(input: Partial<PaperRiskSettings>): PaperRiskSettings {
  riskSettings = normalizeRiskSettings({ ...riskSettings, ...input });
  persistRiskSettings();
  return riskSettings;
}

export function resetPaperAccount(balance = 1000): PaperAccount {
  account.balance = balance;
  account.startingBalance = balance;
  account.positions = [];
  persistAccount();
  return account;
}

export function openPaperPosition(signal: StrategySignal, size = 0.001): PaperPosition | null {
  if (signal.action === 'WAIT' || !signal.suggestedRisk) return null;

  const alreadyOpen = account.positions.some((position) => position.status === 'OPEN' && position.symbol === signal.symbol);
  if (alreadyOpen) return null;

  const effectiveSize = size > 0 ? capSizeByNotional(size, signal.price) : calculateRiskBasedSize(signal);
  if (!Number.isFinite(effectiveSize) || effectiveSize <= 0) return null;

  const entryPrice = applyEntrySlippage(signal.action, signal.price);
  const entryFee = Math.abs(entryPrice * effectiveSize) * riskSettings.commissionRate;

  const position: PaperPosition = {
    id: randomUUID(),
    symbol: signal.symbol,
    side: signal.action,
    entryPrice,
    stopLoss: signal.suggestedRisk.stopLoss,
    takeProfit: signal.suggestedRisk.takeProfit,
    size: effectiveSize,
    entryFee,
    openedAt: new Date().toISOString(),
    status: 'OPEN'
  };

  account.balance -= entryFee;
  account.positions.push(position);
  persistAccount();
  return position;
}

export function evaluatePaperPositions(symbol: string, currentPrice: number): PaperPosition[] {
  const changed: PaperPosition[] = [];

  for (const position of account.positions) {
    if (position.status !== 'OPEN' || position.symbol !== symbol) continue;

    const hitStop = position.side === 'BUY'
      ? currentPrice <= position.stopLoss
      : currentPrice >= position.stopLoss;

    const hitTarget = position.side === 'BUY'
      ? currentPrice >= position.takeProfit
      : currentPrice <= position.takeProfit;

    if (!hitStop && !hitTarget) continue;

    const exitPrice = hitTarget ? position.takeProfit : position.stopLoss;
    finalizePaperSample(position, exitPrice, hitTarget ? 'TARGET' : 'STOP');
    changed.push(position);
  }

  if (changed.length > 0) persistAccount();
  return changed;
}

export function finalizeAllPaperSamples(priceBySymbol: Record<string, number>, reason = 'MANUAL_ALL'): PaperPosition[] {
  const changed: PaperPosition[] = [];

  for (const position of account.positions) {
    if (position.status !== 'OPEN') continue;
    const price = priceBySymbol[position.symbol] ?? position.entryPrice;
    finalizePaperSample(position, price, reason);
    changed.push(position);
  }

  if (changed.length > 0) persistAccount();
  return changed;
}

export function finalizeGreenPaperSamples(priceBySymbol: Record<string, number>, minPnl = 0.05): PaperPosition[] {
  const changed: PaperPosition[] = [];

  for (const position of account.positions) {
    if (position.status !== 'OPEN') continue;
    const price = priceBySymbol[position.symbol] ?? position.entryPrice;
    const pnl = calculatePnl(position, price).net;
    if (pnl < minPnl) continue;
    finalizePaperSample(position, price, 'AUTO_GREEN_LOCK');
    changed.push(position);
  }

  if (changed.length > 0) persistAccount();
  return changed;
}

export function getOpenPaperPnl(priceBySymbol: Record<string, number>) {
  let total = 0;
  const items = [] as Array<{ symbol: string; id: string; pnl: number }>;

  for (const position of account.positions) {
    if (position.status !== 'OPEN') continue;
    const price = priceBySymbol[position.symbol] ?? position.entryPrice;
    const pnl = calculatePnl(position, price).net;
    total += pnl;
    items.push({ symbol: position.symbol, id: position.id, pnl });
  }

  return { total, items };
}

export function getPaperStats() {
  const closed = account.positions.filter((position) => position.status === 'CLOSED');
  const wins = closed.filter((position) => (position.pnl ?? 0) > 0).length;
  const losses = closed.filter((position) => (position.pnl ?? 0) < 0).length;
  const totalPnl = account.balance - account.startingBalance;
  const winRate = closed.length === 0 ? 0 : (wins / closed.length) * 100;

  return {
    startingBalance: account.startingBalance,
    balance: account.balance,
    totalPnl,
    totalPnlPercent: (totalPnl / account.startingBalance) * 100,
    closedCount: closed.length,
    openCount: account.positions.length - closed.length,
    wins,
    losses,
    winRate,
    riskSettings
  };
}

function finalizePaperSample(position: PaperPosition, rawExitPrice: number, reason: string) {
  const executedExitPrice = applyExitSlippage(position.side, rawExitPrice);
  const pnl = calculatePnl(position, executedExitPrice);
  position.status = 'CLOSED';
  position.exitPrice = executedExitPrice;
  position.closedAt = new Date().toISOString();
  position.grossPnl = pnl.gross;
  position.exitFee = pnl.exitFee;
  position.pnl = pnl.net;
  position.closeReason = reason;
  account.balance += pnl.net;
}

function calculatePnl(position: PaperPosition, exitPrice: number): { gross: number; exitFee: number; net: number } {
  const gross = position.side === 'BUY'
    ? (exitPrice - position.entryPrice) * position.size
    : (position.entryPrice - exitPrice) * position.size;
  const exitFee = Math.abs(exitPrice * position.size) * riskSettings.commissionRate;
  return { gross, exitFee, net: gross - exitFee };
}

function calculateRiskBasedSize(signal: StrategySignal): number {
  if (!signal.suggestedRisk) return capSizeByNotional(0.001, signal.price);
  const riskAmount = account.balance * (riskSettings.riskPercent / 100);
  const stopDistance = Math.abs(signal.price - signal.suggestedRisk.stopLoss);
  if (!Number.isFinite(stopDistance) || stopDistance <= 0) return capSizeByNotional(0.001, signal.price);
  return capSizeByNotional(Number((riskAmount / stopDistance).toFixed(6)), signal.price);
}

function capSizeByNotional(size: number, price: number): number {
  const maxSize = riskSettings.maxPositionNotional / Math.max(price, 0.00000001);
  return Number(Math.max(0, Math.min(size, maxSize)).toFixed(6));
}

function applyEntrySlippage(side: TradingSide, price: number): number {
  return side === 'BUY' ? price * (1 + riskSettings.slippageRate) : price * (1 - riskSettings.slippageRate);
}

function applyExitSlippage(side: TradingSide, price: number): number {
  return side === 'BUY' ? price * (1 - riskSettings.slippageRate) : price * (1 + riskSettings.slippageRate);
}

function loadAccount(): PaperAccount {
  try {
    if (!existsSync(accountPath)) return createDefaultAccount();
    const parsed = JSON.parse(readFileSync(accountPath, 'utf8')) as PaperAccount;
    if (!parsed || !Array.isArray(parsed.positions)) return createDefaultAccount();
    return parsed;
  } catch {
    return createDefaultAccount();
  }
}

function loadRiskSettings(): PaperRiskSettings {
  try {
    if (!existsSync(settingsPath)) return defaultSettings;
    const parsed = JSON.parse(readFileSync(settingsPath, 'utf8')) as Partial<PaperRiskSettings>;
    return normalizeRiskSettings({ ...defaultSettings, ...parsed });
  } catch {
    return defaultSettings;
  }
}

function normalizeRiskSettings(settings: PaperRiskSettings): PaperRiskSettings {
  return {
    riskPercent: clamp(settings.riskPercent, 0.05, 5),
    maxPositionNotional: clamp(settings.maxPositionNotional, 5, 1000),
    commissionRate: clamp(settings.commissionRate, 0, 0.01),
    slippageRate: clamp(settings.slippageRate, 0, 0.01),
    maxLossAmount: clamp(settings.maxLossAmount, 1, 10_000)
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(value, max));
}

function persistAccount() {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(accountPath, JSON.stringify(account, null, 2), 'utf8');
}

function persistRiskSettings() {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(riskSettings, null, 2), 'utf8');
}

function createDefaultAccount(): PaperAccount {
  return { balance: 1000, startingBalance: 1000, positions: [] };
}
