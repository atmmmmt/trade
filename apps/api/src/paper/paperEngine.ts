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
  closeReason?: string;
};

export type PaperAccount = {
  balance: number;
  startingBalance: number;
  positions: PaperPosition[];
};

const dataDir = path.resolve(process.cwd(), 'data');
const accountPath = path.join(dataDir, 'paper-account.json');

const account: PaperAccount = loadAccount();

export function getPaperAccount(): PaperAccount {
  return account;
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

  const effectiveSize = size > 0 ? size : calculateRiskBasedSize(signal);

  const position: PaperPosition = {
    id: randomUUID(),
    symbol: signal.symbol,
    side: signal.action,
    entryPrice: signal.price,
    stopLoss: signal.suggestedRisk.stopLoss,
    takeProfit: signal.suggestedRisk.takeProfit,
    size: effectiveSize,
    openedAt: new Date().toISOString(),
    status: 'OPEN'
  };

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

export function finalizeGreenPaperSamples(priceBySymbol: Record<string, number>): PaperPosition[] {
  const changed: PaperPosition[] = [];

  for (const position of account.positions) {
    if (position.status !== 'OPEN') continue;
    const price = priceBySymbol[position.symbol] ?? position.entryPrice;
    const pnl = calculatePnl(position, price);
    if (pnl <= 0) continue;
    finalizePaperSample(position, price, 'MANUAL_GREEN');
    changed.push(position);
  }

  if (changed.length > 0) persistAccount();
  return changed;
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
    winRate
  };
}

function finalizePaperSample(position: PaperPosition, exitPrice: number, reason: string) {
  const pnl = calculatePnl(position, exitPrice);
  position.status = 'CLOSED';
  position.exitPrice = exitPrice;
  position.closedAt = new Date().toISOString();
  position.pnl = pnl;
  position.closeReason = reason;
  account.balance += pnl;
}

function calculatePnl(position: PaperPosition, exitPrice: number): number {
  return position.side === 'BUY'
    ? (exitPrice - position.entryPrice) * position.size
    : (position.entryPrice - exitPrice) * position.size;
}

function calculateRiskBasedSize(signal: StrategySignal): number {
  if (!signal.suggestedRisk) return 0.001;
  const riskAmount = account.balance * 0.01;
  const stopDistance = Math.abs(signal.price - signal.suggestedRisk.stopLoss);
  if (!Number.isFinite(stopDistance) || stopDistance <= 0) return 0.001;
  return Number((riskAmount / stopDistance).toFixed(6));
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

function persistAccount() {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(accountPath, JSON.stringify(account, null, 2), 'utf8');
}

function createDefaultAccount(): PaperAccount {
  return { balance: 1000, startingBalance: 1000, positions: [] };
}
