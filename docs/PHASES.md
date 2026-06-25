# Implementation Phases

## Phase 1 — Market Signal Engine

Status: started.

Goal: read candles and generate BUY / SELL / WAIT analysis without placing orders.

Included now:

- Express API server.
- Binance Futures Testnet public candle reader.
- EMA 9 / EMA 21 trend filter.
- RSI 14 momentum filter.
- ATR 14 dynamic stop distance.
- Risk sizing helper.
- Guard rules for daily loss, consecutive losses, and max open trades.

Test endpoints:

```bash
GET /health
GET /api/bot/signal?symbol=BTCUSDT&interval=1m
GET /api/bot/risk?balance=1000&entry=60000&stopLoss=59400&riskPercent=1
GET /api/bot/guard?dailyLossPercent=1&consecutiveLosses=0&openTrades=0
```

## Phase 2 — Paper Mode

Next tasks:

- Add in-memory virtual account.
- Simulate entries and exits.
- Save decisions to local JSON or MongoDB.
- Add trade journal.
- Add win rate, profit factor, drawdown.

## Phase 3 — Testnet Execution

Only after Phase 2 results are acceptable.

Next tasks:

- Add signed Binance Testnet requests.
- Add market order on testnet.
- Add stop loss and take profit orders on testnet.
- Add emergency close-all endpoint.
- Add strict guard before every order.

## Phase 4 — Dashboard

Next tasks:

- React dashboard.
- Bot status panel.
- Signal chart.
- Trade journal.
- Risk settings.
- Start / pause controls.

## Phase 5 — Production Readiness

Only after weeks of testing.

Checklist:

- Testnet stable.
- Strategy has enough historical and live sample size.
- Keys are secured in server environment only.
- Withdrawals disabled.
- IP whitelist enabled.
- Small capital only.
- Daily stop limit enabled.
