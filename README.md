# Smart Crypto Trading Bot

> Experimental market-analysis system for learning, strategy testing, paper mode, sandbox checks, alerts, and dashboard monitoring.

## Important Safety Notice

This project is for **testing and education first**. It does not guarantee profit. Markets are risky. Real-money usage is intentionally not automated in this version.

Never commit API keys, secrets, or real account credentials.

## Current Status

Implemented:

- Phase 1: Signal Engine.
- Phase 2: Paper Mode.
- Phase 3: Sandbox account status checker only.
- Phase 4: React Dashboard.
- Phase 5: Safety documentation and guarded environment setup.

## Stack

- Node.js + TypeScript
- Express API
- React + Vite dashboard
- Binance Futures Testnet market data
- Paper mode simulator
- Backtest engine
- Telegram alert module

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev:api
```

Open another terminal for dashboard:

```bash
npm run dev:dashboard
```

API:

```txt
http://localhost:5000
```

Dashboard:

```txt
http://localhost:5173
```

## Main Endpoints

```txt
GET  /health
GET  /api/bot/signal?symbol=BTCUSDT&interval=1m
GET  /api/bot/risk?balance=1000&entry=60000&stopLoss=59400&riskPercent=1
GET  /api/bot/guard?dailyLossPercent=1&consecutiveLosses=0&openTrades=0
GET  /api/lab/backtest?symbol=BTCUSDT&interval=1m&limit=500
GET  /api/lab/paper/account
POST /api/lab/paper/tick
POST /api/lab/paper/reset
POST /api/alerts/telegram/test
GET  /api/sandbox/status
```

## Docs

- `docs/RUN_GUIDE.md`
- `docs/PHASES.md`
- `docs/SECURITY.md`

## Sandbox Keys

Use only testnet/sandbox keys during early phases.

Do not add real exchange keys to this repo.
