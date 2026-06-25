import { Router } from 'express';
import { z } from 'zod';
import { getFuturesCandles, type KlineInterval } from '../exchange/binanceFuturesTestnet.js';
import { buildRiskPlan, shouldStopTrading } from '../risk/riskManager.js';
import { emaRsiAtrStrategy } from '../strategies/emaRsiAtrStrategy.js';

export const botRouter = Router();

const SignalQuerySchema = z.object({
  symbol: z.string().min(3).default('BTCUSDT'),
  interval: z.enum(['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d']).default('1m'),
  limit: z.coerce.number().int().min(60).max(500).default(150)
});

botRouter.get('/signal', async (req, res, next) => {
  try {
    const query = SignalQuerySchema.parse(req.query);
    const candles = await getFuturesCandles({
      symbol: query.symbol,
      interval: query.interval as KlineInterval,
      limit: query.limit
    });

    const signal = emaRsiAtrStrategy({
      symbol: query.symbol.toUpperCase(),
      interval: query.interval,
      candles
    });

    res.json({
      ok: true,
      mode: 'signal-only',
      message: 'This endpoint analyzes only. It does not place orders.',
      data: signal
    });
  } catch (error) {
    next(error);
  }
});

const RiskQuerySchema = z.object({
  balance: z.coerce.number().positive(),
  entry: z.coerce.number().positive(),
  stopLoss: z.coerce.number().positive(),
  riskPercent: z.coerce.number().positive().max(5).optional()
});

botRouter.get('/risk', (req, res, next) => {
  try {
    const query = RiskQuerySchema.parse(req.query);
    const plan = buildRiskPlan({
      accountBalance: query.balance,
      entryPrice: query.entry,
      stopLoss: query.stopLoss,
      riskPercent: query.riskPercent
    });

    res.json({ ok: true, data: plan });
  } catch (error) {
    next(error);
  }
});

botRouter.get('/guard', (req, res) => {
  const dailyLossPercent = Number(req.query.dailyLossPercent ?? 0);
  const consecutiveLosses = Number(req.query.consecutiveLosses ?? 0);
  const openTrades = Number(req.query.openTrades ?? 0);

  res.json({
    ok: true,
    data: shouldStopTrading({ dailyLossPercent, consecutiveLosses, openTrades })
  });
});
