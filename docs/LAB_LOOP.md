# Lab Loop Guide

Lab Loop is the automatic paper-mode watcher.

It does not send live exchange orders. It only uses the paper-mode simulator.

## What it does every cycle

1. Scans the market.
2. Selects candidates by volume, movement, and strategy score.
3. Runs a signal check.
4. Runs a quick backtest.
5. Applies safety filters.
6. Records a paper-mode sample only if the filters pass.
7. Updates existing paper-mode samples if target or stop is reached.

## Default filters

- Interval: 1m
- Cycle time: 60 seconds
- Minimum confidence: 80
- Minimum backtest profit: 1%
- Minimum backtest samples: 3
- Max 24h absolute movement: 22%
- Minimum quote volume: 20,000,000

## API

Status:

```txt
GET /api/lab-loop/status
```

Start:

```txt
POST /api/lab-loop/start
```

Stop:

```txt
POST /api/lab-loop/stop
```

Run one cycle:

```txt
POST /api/lab-loop/run-once
```

## Dashboard

Use these buttons:

- Start Lab Loop: starts automatic 60-second cycles.
- Stop Lab Loop: stops automatic cycles.
- Run Loop Once: runs one cycle now.
- Refresh Loop: refreshes current state.

## Important

Keep this mode for testing only. Use it for at least several days and review the paper-mode results before thinking about testnet execution.
