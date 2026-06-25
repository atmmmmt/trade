import { Router } from 'express';
import { z } from 'zod';
import { sendTelegramMessage } from '../alerts/telegram.js';

export const alertRouter = Router();

alertRouter.post('/telegram/test', async (req, res, next) => {
  try {
    const body = z.object({ message: z.string().min(1).default('Market lab test alert') }).parse(req.body ?? {});
    const result = await sendTelegramMessage(body.message);
    res.json({ ok: true, data: result });
  } catch (error) {
    next(error);
  }
});
