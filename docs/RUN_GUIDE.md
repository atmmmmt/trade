# Run Guide

## 1. Install requirements

Install Node.js 20 or newer.

## 2. Download project

```bash
git clone https://github.com/atmmmmt/trade.git
cd trade
npm install
```

## 3. Create environment file

Windows CMD:

```bash
copy .env.example .env
```

PowerShell:

```bash
Copy-Item .env.example .env
```

Mac / Linux:

```bash
cp .env.example .env
```

Keep `TRADING_MODE=signal` while testing.

## 4. Run API

```bash
npm run dev:api
```

API URL:

```txt
http://localhost:5000
```

Health check:

```txt
http://localhost:5000/health
```

## 5. Run dashboard

Open a second terminal:

```bash
npm run dev:dashboard
```

Dashboard URL:

```txt
http://localhost:5173
```

## 6. Useful API links

Signal:

```txt
http://localhost:5000/api/bot/signal?symbol=BTCUSDT&interval=1m
```

Risk helper:

```txt
http://localhost:5000/api/bot/risk?balance=1000&entry=60000&stopLoss=59400&riskPercent=1
```

Backtest:

```txt
http://localhost:5000/api/lab/backtest?symbol=BTCUSDT&interval=1m&limit=500&startingBalance=1000&riskPercent=1
```

Paper account:

```txt
http://localhost:5000/api/lab/paper/account
```

Sandbox status after adding sandbox keys to `.env`:

```txt
http://localhost:5000/api/sandbox/status
```

## 7. Recommended workflow

1. Run Signal and check reasons.
2. Run Backtest and check win rate and drawdown.
3. Run Paper Tick many times during live market.
4. Add Telegram keys and test alerts.
5. Add sandbox keys only after the above works.
6. Keep real-money mode disabled until the system proves itself over enough tests.
