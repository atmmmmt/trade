import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { alertRouter } from './routes/alert.routes.js';
import { botRouter } from './routes/bot.routes.js';
import { labRouter } from './routes/lab.routes.js';
import { sandboxRouter } from './routes/sandbox.routes.js';
import { scannerRouter } from './routes/scanner.routes.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'market-analysis-api', mode: env.TRADING_MODE, time: new Date().toISOString() });
});

app.use('/api/bot', botRouter);
app.use('/api/lab', labRouter);
app.use('/api/alerts', alertRouter);
app.use('/api/sandbox', sandboxRouter);
app.use('/api/scanner', scannerRouter);

app.use((req, res) => {
  res.status(404).json({ ok: false, error: `Route not found: ${req.method} ${req.path}` });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ ok: false, error: 'Validation error', details: error.flatten() });
  }

  const message = error instanceof Error ? error.message : 'Unknown server error';
  return res.status(500).json({ ok: false, error: message });
});

app.listen(env.PORT, () => {
  console.log(`API running on http://localhost:${env.PORT}`);
  console.log(`Mode: ${env.TRADING_MODE}`);
});
