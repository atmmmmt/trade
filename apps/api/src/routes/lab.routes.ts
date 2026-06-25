import { Router } from 'express';
import { z } from 'zod';
import { runBacktest } from '../backtest/backtestEngine.js';
import { getFuturesCandles, type KlineInterval } from '../exchange/binanceFuturesTestnet.js';
import { evaluatePaperPositions, getPaperAccount, getPaperStats, openPaperPosition, resetPaperAccount } from '../paper/paperEngine.js';
import { emaRsiAtrStrategy } from '../strategies/emaRsiAtrStrategy.js';

export const labRouter = Router();

const LabSchema = z.object({
  symbol: z.string().min(3).default('BTCUSDT'),
  interval: z.enum(['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d']).default('1m'),
  limit: z.coerce.number().int().min(60).max(500).default(150)
});

labRouter.get('/paper/account', (_req, res) => {
  res.json({ ok: true, data: getPaperAccount(), stats: getPaperStats() });
});

labRouter.post('/paper/reset', (req, res) => {
  const balance = Number(req.body?.balance ?? 1000);
  res.json({ ok: true, data: resetPaperAccount(balance) });
});

labRouter.post('/paper/tick', async (req, res, next) => {
  try {
    const query = LabSchema.parse(req.body ?? {});
    const candles = await getFuturesCandles({ symbol: query.symbol, interval: query.interval as KlineInterval, limit: query.limit });
    const signal = emaRsiAtrStrategy({ symbol: query.symbol.toUpperCase(), interval: query.interval, candles });
    const currentPrice = candles[candles.length - 1]?.close ?? signal.price;
    const closed = evaluatePaperPositions(query.symbol.toUpperCase(), currentPrice);
    const opened = openPaperPosition(signal, Number(req.body?.size ?? 0.001));
    res.json({ ok: true, signal, opened, closed, account: getPaperAccount(), stats: getPaperStats() });
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
