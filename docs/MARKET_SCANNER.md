# Market Scanner Guide

## What it does

The scanner checks active USDT perpetual markets and ranks them using:

- 24h quote volume.
- 24h movement percent.
- Strategy signal confidence.
- Trend, RSI, and ATR.

It excludes stablecoin-like pairs and low-liquidity markets.

## API

```txt
GET /api/scanner/best?interval=1m&top=12&limit=120&minQuoteVolume=20000000
```

Example browser URL:

```txt
http://localhost:5000/api/scanner/best?interval=1m&top=12&limit=120&minQuoteVolume=20000000
```

## Dashboard

Click:

```txt
Find Best Market
```

The dashboard will:

1. Scan markets.
2. Show the best candidate.
3. Fill the Symbol input with the best symbol.
4. You can then click Run Signal, Run Backtest, or Paper Tick.

## Recommended usage

Start with paper mode only:

1. Click Find Best Market.
2. Click Run Signal.
3. Click Run Backtest.
4. Click Paper Tick.
5. Repeat on 3m and 5m intervals.

Do not use real capital based only on the scanner result. It is a ranking helper, not a guarantee.
