import { runBacktest } from '../backtest/backtestEngine.js';
import { getFuturesCandles, type KlineInterval } from '../exchange/binanceFuturesTestnet.js';
import { evaluatePaperPositions, finalizeAllPaperSamples, finalizeGreenPaperSamples, getOpenPaperPnl, getPaperAccount, getPaperStats, openPaperPosition } from '../paper/paperEngine.js';
import { scanBestMarket } from '../scanner/marketScanner.js';
import { emaRsiAtrStrategy } from '../strategies/emaRsiAtrStrategy.js';

export type LabLoopConfig = {
  enabled: boolean;
  interval: KlineInterval;
  intervalSeconds: number;
  top: number;
  minQuoteVolume: number;
  minConfidence: number;
  minBacktestProfitPercent: number;
  minBacktestTrades: number;
  minWinRate: number;
  maxDrawdownPercent: number;
  maxAbsMove24h: number;
  maxOpenPositions: number;
  size: number;
};

export type LabLoopResult = {
  time: string;
  symbol?: string;
  result: 'RECORDED' | 'SKIPPED' | 'UPDATED' | 'ERROR';
  notes: string[];
  signal?: unknown;
  backtest?: unknown;
  recorded?: unknown;
  updated?: unknown[];
};

type LabLoopState = {
  enabled: boolean;
  running: boolean;
  startedAt: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runs: number;
  config: LabLoopConfig;
  lastResult: LabLoopResult | null;
  lastError: string | null;
};

const baseConfig: LabLoopConfig = {
  enabled: false,
  interval: '1m',
  intervalSeconds: 60,
  top: 12,
  minQuoteVolume: 8_000_000,
  minConfidence: 60,
  minBacktestProfitPercent: 0,
  minBacktestTrades: 1,
  minWinRate: 0,
  maxDrawdownPercent: 30,
  maxAbsMove24h: 70,
  maxOpenPositions: 4,
  size: 0
};

const greenCloseMinPnl = 0.05;
const protectStartPnl = 5;
const protectGivebackRatio = 0.25;
const hardLockPnl = 10;

const state: LabLoopState = {
  enabled: false,
  running: false,
  startedAt: null,
  lastRunAt: null,
  nextRunAt: null,
  runs: 0,
  config: baseConfig,
  lastResult: null,
  lastError: null
};

let timer: NodeJS.Timeout | null = null;

export function getLabLoopState() {
  return { ...state, account: getPaperAccount(), stats: getPaperStats() };
}

export function startLabLoop(input: Partial<LabLoopConfig> = {}) {
  stopLabLoop();
  state.config = normalize({ ...baseConfig, ...input, enabled: true });
  state.enabled = true;
  state.startedAt = new Date().toISOString();
  state.lastError = null;
  planNext(0);
  return getLabLoopState();
}

export function stopLabLoop() {
  if (timer) clearTimeout(timer);
  timer = null;
  state.enabled = false;
  state.running = false;
  state.nextRunAt = null;
  state.config = { ...state.config, enabled: false };
  return getLabLoopState();
}

export async function runLabLoopOnce() {
  if (state.running) return getLabLoopState();
  state.running = true;
  state.lastRunAt = new Date().toISOString();
  state.runs += 1;

  try {
    state.lastResult = await evaluate(state.config);
    state.lastError = null;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    state.lastError = message;
    state.lastResult = { time: new Date().toISOString(), result: 'ERROR', notes: [message] };
  } finally {
    state.running = false;
    if (state.enabled) planNext(state.config.intervalSeconds * 1000);
  }

  return getLabLoopState();
}

async function evaluate(config: LabLoopConfig): Promise<LabLoopResult> {
  const protection = await runProtectionReview(config.interval);
  if (protection) return protection;

  const scan = await scanBestMarket({ interval: config.interval, limit: 120, top: config.top, minQuoteVolume: config.minQuoteVolume });
  const notes: string[] = [];
  const account = getPaperAccount();
  const openPositions = account.positions.filter((position) => position.status === 'OPEN');

  if (openPositions.length >= config.maxOpenPositions) {
    for (const position of openPositions) {
      const candles = await getFuturesCandles({ symbol: position.symbol, interval: config.interval, limit: 60 });
      const currentPrice = candles[candles.length - 1]?.close ?? position.entryPrice;
      const updated = evaluatePaperPositions(position.symbol, currentPrice);
      if (updated.length > 0) {
        return { time: new Date().toISOString(), symbol: position.symbol, result: 'UPDATED', notes: ['maximum open samples reached; updated existing sample only'], updated };
      }
    }

    return { time: new Date().toISOString(), result: 'SKIPPED', notes: [`maximum open samples reached: ${openPositions.length}/${config.maxOpenPositions}`] };
  }

  for (const item of scan.candidates) {
    const candles = await getFuturesCandles({ symbol: item.symbol, interval: config.interval, limit: 500 });
    const currentPrice = candles[candles.length - 1]?.close ?? item.lastPrice;
    const updated = evaluatePaperPositions(item.symbol, currentPrice);
    const signal = emaRsiAtrStrategy({ symbol: item.symbol, interval: config.interval, candles: candles.slice(-150) });
    const test = runBacktest({ symbol: item.symbol, interval: config.interval, candles, startingBalance: 1000, riskPercent: 1 });

    const blockers = [
      signal.action !== 'WAIT' ? null : 'signal WAIT',
      signal.confidence >= config.minConfidence ? null : `confidence ${signal.confidence} < ${config.minConfidence}`,
      test.totalPnlPercent >= config.minBacktestProfitPercent ? null : `test ${test.totalPnlPercent.toFixed(2)}% < ${config.minBacktestProfitPercent}%`,
      test.trades.length >= config.minBacktestTrades ? null : `samples ${test.trades.length} < ${config.minBacktestTrades}`,
      test.winRate >= config.minWinRate ? null : `win rate ${test.winRate.toFixed(2)}% < ${config.minWinRate}%`,
      test.maxDrawdownPercent <= config.maxDrawdownPercent ? null : `drawdown ${test.maxDrawdownPercent.toFixed(2)}% > ${config.maxDrawdownPercent}%`,
      Math.abs(item.priceChangePercent24h) <= config.maxAbsMove24h ? null : `24h move ${item.priceChangePercent24h.toFixed(2)}%`,
      getPaperAccount().positions.some((p) => p.status === 'OPEN' && p.symbol === item.symbol) ? 'already active' : null
    ].filter(Boolean) as string[];

    if (blockers.length > 0) {
      notes.push(`${item.symbol}: ${blockers.join(', ')}`);
      if (updated.length > 0) {
        return { time: new Date().toISOString(), symbol: item.symbol, result: 'UPDATED', notes, signal, backtest: shortTest(test), updated };
      }
      continue;
    }

    const recorded = openPaperPosition(signal, config.size);
    return { time: new Date().toISOString(), symbol: item.symbol, result: recorded ? 'RECORDED' : 'SKIPPED', notes: recorded ? ['balanced paper review passed'] : ['nothing recorded'], signal, backtest: shortTest(test), recorded, updated };
  }

  return { time: new Date().toISOString(), result: 'SKIPPED', notes: notes.length > 0 ? notes : ['no candidate passed balanced review'] };
}

async function runProtectionReview(interval: KlineInterval): Promise<LabLoopResult | null> {
  const priceBySymbol = await currentOpenPrices(interval);
  const greenClosed = finalizeGreenPaperSamples(priceBySymbol, greenCloseMinPnl);
  if (greenClosed.length > 0) {
    return { time: new Date().toISOString(), result: 'UPDATED', notes: [`green lock closed ${greenClosed.length} sample(s) at min ${greenCloseMinPnl}`], updated: greenClosed };
  }

  const stats = getPaperStats();
  const openPnl = getOpenPaperPnl(priceBySymbol).total;
  const account = getPaperAccount();
  const openCount = account.positions.filter((position) => position.status === 'OPEN').length;

  if (stats.totalPnl >= hardLockPnl && openCount > 0) {
    const closed = finalizeAllPaperSamples(priceBySymbol, 'HARD_PROFIT_LOCK');
    return { time: new Date().toISOString(), result: 'UPDATED', notes: [`hard lock protected paper gain above ${hardLockPnl}`], updated: closed };
  }

  if (stats.totalPnl >= protectStartPnl && openPnl < 0 && Math.abs(openPnl) >= stats.totalPnl * protectGivebackRatio) {
    const closed = finalizeAllPaperSamples(priceBySymbol, 'GIVEBACK_PROTECTION');
    return { time: new Date().toISOString(), result: 'UPDATED', notes: [`giveback protection closed open samples: open=${openPnl.toFixed(4)}, total=${stats.totalPnl.toFixed(4)}`], updated: closed };
  }

  return null;
}

async function currentOpenPrices(interval: KlineInterval) {
  const symbols = [...new Set(getPaperAccount().positions.filter((position) => position.status === 'OPEN').map((position) => position.symbol))];
  const priceBySymbol: Record<string, number> = {};

  for (const symbol of symbols) {
    try {
      const candles = await getFuturesCandles({ symbol, interval, limit: 60 });
      priceBySymbol[symbol] = candles[candles.length - 1]?.close ?? 0;
    } catch {
      priceBySymbol[symbol] = 0;
    }
  }

  return priceBySymbol;
}

function shortTest(test: ReturnType<typeof runBacktest>) {
  return { symbol: test.symbol, interval: test.interval, totalPnlPercent: test.totalPnlPercent, trades: test.trades.length, wins: test.wins, losses: test.losses, winRate: test.winRate, maxDrawdownPercent: test.maxDrawdownPercent };
}

function planNext(delayMs: number) {
  if (timer) clearTimeout(timer);
  state.nextRunAt = new Date(Date.now() + delayMs).toISOString();
  timer = setTimeout(() => { void runLabLoopOnce(); }, delayMs);
}

function normalize(config: LabLoopConfig): LabLoopConfig {
  return {
    ...config,
    intervalSeconds: Math.max(30, Math.min(config.intervalSeconds, 3600)),
    top: Math.max(3, Math.min(config.top, 30)),
    minQuoteVolume: Math.max(1_000_000, config.minQuoteVolume),
    minConfidence: Math.max(50, Math.min(config.minConfidence, 95)),
    minBacktestProfitPercent: Math.max(-10, config.minBacktestProfitPercent),
    minBacktestTrades: Math.max(1, Math.min(config.minBacktestTrades, 50)),
    minWinRate: Math.max(0, Math.min(config.minWinRate, 100)),
    maxDrawdownPercent: Math.max(1, Math.min(config.maxDrawdownPercent, 60)),
    maxAbsMove24h: Math.max(3, Math.min(config.maxAbsMove24h, 80)),
    maxOpenPositions: Math.max(1, Math.min(config.maxOpenPositions, 5)),
    size: Math.max(0, Math.min(config.size, 1))
  };
}
