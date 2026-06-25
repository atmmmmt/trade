import { atr, ema, last, rsi } from '../indicators/technical.js';
import type { Candle, StrategySignal } from '../trading/types.js';

export function emaRsiAtrStrategy(params: {
  symbol: string;
  interval: string;
  candles: Candle[];
}): StrategySignal {
  const { symbol, interval, candles } = params;
  const closes = candles.map((candle) => candle.close);
  const current = last(candles);

  if (!current || candles.length < 60) {
    return waitSignal(symbol, interval, current?.close ?? 0, ['Not enough candles. Need at least 60 candles.']);
  }

  const emaFastSeries = ema(closes, 9);
  const emaSlowSeries = ema(closes, 21);
  const rsiSeries = rsi(closes, 14);
  const atrSeries = atr(candles, 14);

  const emaFast = last(emaFastSeries);
  const emaSlow = last(emaSlowSeries);
  const currentRsi = last(rsiSeries);
  const currentAtr = last(atrSeries);

  if (!emaFast || !emaSlow || !currentRsi || !currentAtr) {
    return waitSignal(symbol, interval, current.close, ['Indicators are not ready yet.']);
  }

  const trend = emaFast > emaSlow ? 'UP' : emaFast < emaSlow ? 'DOWN' : 'SIDEWAYS';
  const reasons: string[] = [];
  let confidence = 0;

  if (trend === 'UP') {
    reasons.push('Fast EMA is above slow EMA, market trend is currently bullish.');
    confidence += 30;
  }

  if (trend === 'DOWN') {
    reasons.push('Fast EMA is below slow EMA, market trend is currently bearish.');
    confidence += 30;
  }

  if (current.close > emaFast && trend === 'UP') {
    reasons.push('Price is trading above fast EMA, bullish continuation is possible.');
    confidence += 25;
  }

  if (current.close < emaFast && trend === 'DOWN') {
    reasons.push('Price is trading below fast EMA, bearish continuation is possible.');
    confidence += 25;
  }

  if (currentRsi >= 45 && currentRsi <= 68 && trend === 'UP') {
    reasons.push('RSI is strong but not extremely overbought.');
    confidence += 25;
  }

  if (currentRsi >= 32 && currentRsi <= 55 && trend === 'DOWN') {
    reasons.push('RSI is weak but not extremely oversold.');
    confidence += 25;
  }

  if (currentAtr > 0) {
    reasons.push('ATR is available and can be used for dynamic stop loss.');
    confidence += 10;
  }

  const buySetup = trend === 'UP' && current.close > emaFast && currentRsi >= 45 && currentRsi <= 68;
  const sellSetup = trend === 'DOWN' && current.close < emaFast && currentRsi >= 32 && currentRsi <= 55;

  if (!buySetup && !sellSetup) {
    return {
      action: 'WAIT',
      symbol,
      interval,
      price: current.close,
      confidence: Math.min(confidence, 60),
      reasons: reasons.length > 0 ? reasons : ['No clean setup. Waiting is safer than forcing a trade.'],
      indicators: {
        emaFast,
        emaSlow,
        rsi: currentRsi,
        atr: currentAtr,
        trend
      },
      createdAt: new Date().toISOString()
    };
  }

  const action = buySetup ? 'BUY' : 'SELL';
  const atrMultiplier = 1.5;
  const riskReward = 2;
  const stopDistance = currentAtr * atrMultiplier;
  const stopLoss = action === 'BUY' ? current.close - stopDistance : current.close + stopDistance;
  const takeProfit = action === 'BUY'
    ? current.close + stopDistance * riskReward
    : current.close - stopDistance * riskReward;

  return {
    action,
    symbol,
    interval,
    price: current.close,
    confidence: Math.min(confidence, 90),
    reasons,
    indicators: {
      emaFast,
      emaSlow,
      rsi: currentRsi,
      atr: currentAtr,
      trend
    },
    suggestedRisk: {
      stopLoss,
      takeProfit,
      riskReward
    },
    createdAt: new Date().toISOString()
  };
}

function waitSignal(symbol: string, interval: string, price: number, reasons: string[]): StrategySignal {
  return {
    action: 'WAIT',
    symbol,
    interval,
    price,
    confidence: 0,
    reasons,
    indicators: {},
    createdAt: new Date().toISOString()
  };
}
