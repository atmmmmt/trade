import { Router } from 'express';
import { z } from 'zod';
import { runBacktest } from '../backtest/backtestEngine.js';
import { getFuturesCandles, type KlineInterval } from '../exchange/binanceFuturesTestnet.js';
import {
  evaluatePaperPositions,
  finalizeAllPaperSamples,
  finalizeGreenPaperSamples,
  getPaperAccount,
  getPaperStats,
  openPaperPosition,
  resetPaperAccount
} from '../paper/paperEngine.js';
import { buildPaperSummary } from '../paper/paperSummary.js';
import { emaRsiAtrStrategy } from '../strategies/emaRsiAtrStrategy.js';

export const labRouter = Router();

const LabSchema = z.object({
  symbol: z.string().min(3).default('BTCUSDT'),
  interval: z.enum(['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d']).default('1m'),
  limit: z.coerce.number().int().min(60).max(500).default(150)
});

const greenCloseMinPnl = 0.05;

labRouter.get('/paper/account', (_req, res) => {
  res.json({ ok: true, data: getPaperAccount(), stats: getPaperStats() });
});

labRouter.get('/paper/summary', async (_req, res, next) => {
  try {
    const data = await buildPaperSummary();
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

labRouter.post('/paper/reset', (req, res) => {
  const balance = Number(req.body?.balance ?? 1000);
  res.json({ ok: true, data: resetPaperAccount(balance) });
});

labRouter.post('/paper/close-winners', async (_req, res, next) => {
  try {
    const priceBySymbol = await currentPricesForOpenSymbols();
    const closed = finalizeGreenPaperSamples(priceBySymbol, greenCloseMinPnl);
    const summary = await buildPaperSummary();
    res.json({ ok: true, closed, minPnl: greenCloseMinPnl, summary });
  } catch (error) {
    next(error);
  }
});

labRouter.post('/paper/close-all', async (_req, res, next) => {
  try {
    const priceBySymbol = await currentPricesForOpenSymbols();
    const closed = finalizeAllPaperSamples(priceBySymbol, 'MANUAL_ALL');
    const summary = await buildPaperSummary();
    res.json({ ok: true, closed, summary });
  } catch (error) {
    next(error);
  }
});

labRouter.post('/paper/tick', async (req, res, next) => {
  try {
    const query = LabSchema.parse(req.body ?? {});
    const candles = await getFuturesCandles({ symbol: query.symbol, interval: query.interval as KlineInterval, limit: query.limit });
    const signal = emaRsiAtrStrategy({ symbol: query.symbol.toUpperCase(), interval: query.interval, candles });
    const currentPrice = candles[candles.length - 1]?.close ?? signal.price;
    const closed = evaluatePaperPositions(query.symbol.toUpperCase(), currentPrice);
    const opened = openPaperPosition(signal, Number(req.body?.size ?? 0.001));
    const summary = await buildPaperSummary();
    res.json({ ok: true, signal, opened, closed, account: getPaperAccount(), stats: getPaperStats(), summary });
  } catch (error) {
    next(error);
  }
});

labRouter.get('/backtest', async (req, res, next) => {
  try {
    const query = LabSchema.extend({
      startingBalance: z.coerce.number().positive().default(1000),
      riskPercent: z.coerce.number().positive().max(5).default(1)
    }).parse(req.query);
    const candles = await getFuturesCandles({ symbol: query.symbol, interval: query.interval as KlineInterval, limit: query.limit });
    const data = runBacktest({
      symbol: query.symbol.toUpperCase(),
      interval: query.interval,
      candles,
      startingBalance: query.startingBalance,
      riskPercent: query.riskPercent
    });
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

async function currentPricesForOpenSymbols() {
  const symbols = [...new Set(getPaperAccount().positions.filter((position) => position.status === 'OPEN').map((position) => position.symbol))];
  const priceBySymbol: Record<string, number> = {};

  for (const symbol of symbols) {
    try {
      const candles = await getFuturesCandles({ symbol, interval: '1m', limit: 60 });
      priceBySymbol[symbol] = candles[candles.length - 1]?.close ?? 0;
    } catch {
      priceBySymbol[symbol] = 0;
    }
  }

  return priceBySymbol;
}
