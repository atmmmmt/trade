# Smart Crypto Trading Bot

> Experimental trading bot system for learning, backtesting, paper trading, and Binance Futures Testnet execution.

## Important Safety Notice

This project is for **testing and education first**. It does not guarantee profit. Markets are risky and any real-money deployment must use small capital, strict risk limits, and API keys with withdrawals disabled.

Never commit API keys, secrets, or real account credentials.

## Project Goal

Build a professional trading system in phases:

1. **Phase 1 — Signal Engine**
   - Read market candles.
   - Analyze trend and momentum.
   - Return BUY / SELL / WAIT decisions with reasons.
   - No real orders.

2. **Phase 2 — Paper Trading**
   - Simulate entries and exits.
   - Track virtual PnL.
   - Log every decision.

3. **Phase 3 — Binance Futures Testnet**
   - Connect to Binance testnet only.
   - Place test orders.
   - Validate execution, stop loss, take profit, and limits.

4. **Phase 4 — Dashboard**
   - Control bot status.
   - View trades, PnL, risk, logs, and strategy settings.

5. **Phase 5 — Real Trading Preparation**
   - Only after long testing.
   - Small capital.
   - Withdrawal disabled.
   - IP whitelist enabled.

## Stack

- Node.js + TypeScript
- Express API
- MongoDB later for trade history and settings
- Binance Futures Testnet REST API
- Telegram alerts later
- React dashboard later

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

API health check:

```bash
GET http://localhost:5000/health
```

Run one strategy check:

```bash
GET http://localhost:5000/api/bot/signal?symbol=BTCUSDT&interval=1m
```

## Binance Testnet

Use only Binance Futures Testnet keys during early phases.

Do not add real Binance keys to this repo.
