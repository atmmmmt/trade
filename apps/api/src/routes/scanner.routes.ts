import { Router } from 'express';
import { z } from 'zod';
import { scanBestMarket } from '../scanner/marketScanner.js';

export const scannerRouter = Router();

const ScanQuerySchema = z.object({
  interval: z.enum(['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d']).default('1m'),
  limit: z.coerce.number().int().min(60).max(500).default(120),
  top: z.coerce.number().int().min(3).max(30).default(12),
  minQuoteVolume: z.coerce.number().positive().default(20_000_000)
});

scannerRouter.get('/best', async (req, res, next) => {
  try {
    const query = ScanQuerySchema.parse(req.query);
    const data = await scanBestMarket(query);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
});
