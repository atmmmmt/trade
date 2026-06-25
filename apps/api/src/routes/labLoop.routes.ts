import { Router } from 'express';
import { z } from 'zod';
import { getLabLoopState, runLabLoopOnce, startLabLoop, stopLabLoop } from '../auto/labLoop.js';

export const labLoopRouter = Router();

const StartSchema = z.object({
  interval: z.enum(['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d']).default('1m'),
  intervalSeconds: z.coerce.number().int().min(30).max(3600).default(60),
  top: z.coerce.number().int().min(3).max(30).default(12),
  minQuoteVolume: z.coerce.number().positive().default(20_000_000),
  minConfidence: z.coerce.number().min(50).max(95).default(85),
  minBacktestProfitPercent: z.coerce.number().min(0).default(2),
  minBacktestTrades: z.coerce.number().int().min(1).max(50).default(8),
  minWinRate: z.coerce.number().min(0).max(100).default(52),
  maxDrawdownPercent: z.coerce.number().min(1).max(60).default(8),
  maxAbsMove24h: z.coerce.number().min(3).max(80).default(18),
  maxOpenPositions: z.coerce.number().int().min(1).max(5).default(2),
  size: z.coerce.number().min(0).default(0)
});

labLoopRouter.get('/status', (_req, res) => {
  res.json({ ok: true, data: getLabLoopState() });
});

labLoopRouter.post('/start', (req, res) => {
  const config = StartSchema.parse(req.body ?? {});
  res.json({ ok: true, data: startLabLoop(config) });
});

labLoopRouter.post('/stop', (_req, res) => {
  res.json({ ok: true, data: stopLabLoop() });
});

labLoopRouter.post('/run-once', async (_req, res, next) => {
  try {
    const data = await runLabLoopOnce();
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
});
