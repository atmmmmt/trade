import { Router } from 'express';
import { getSandboxAccountInfo } from '../exchange/sandboxAccount.js';

export const sandboxRouter = Router();

sandboxRouter.get('/status', async (_req, res, next) => {
  try {
    const data = await getSandboxAccountInfo();
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
});
