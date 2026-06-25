import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  TRADING_MODE: z.enum(['signal', 'paper', 'testnet', 'live']).default('signal'),
  BINANCE_FUTURES_TESTNET_BASE_URL: z.string().url().default('https://testnet.binancefuture.com'),
  BINANCE_API_KEY: z.string().optional().default(''),
  BINANCE_API_SECRET: z.string().optional().default(''),
  DEFAULT_RISK_PERCENT: z.coerce.number().positive().max(5).default(1),
  MAX_DAILY_LOSS_PERCENT: z.coerce.number().positive().max(20).default(3),
  MAX_CONSECUTIVE_LOSSES: z.coerce.number().int().positive().max(20).default(3),
  MAX_OPEN_TRADES: z.coerce.number().int().positive().max(10).default(1),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(''),
  TELEGRAM_CHAT_ID: z.string().optional().default('')
});

export const env = EnvSchema.parse(process.env);

export const isLiveMode = env.TRADING_MODE === 'live';
