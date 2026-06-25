import { Router } from 'express';
import { z } from 'zod';
import { getLabLoopState, runLabLoopOnce, startLabLoop, stopLabLoop } from '../auto/labLoop.js';

export const labLoopRouter = Router();

const StartSchema = z.object({
  interval: z.enum(['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d']).default('1m'),
  intervalSeconds: z.coerce.number().int().min(30).max(3600).default(60)
}).passthrough();

labLoopRouter.get('/status', (_req, res) => {
  res.json({ ok: true, data: getLabLoopState() });
});

labLoopRouter.post('/start', (req, res) => {
  const config = StartSchema.parse(req.body ?? {});
  res.json({ ok: true, data: startLabLoop(config as never) });
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
