import type { Candle } from '../trading/types.js';

export function ema(values: number[], period: number): number[] {
  if (period <= 0) throw new Error('EMA period must be positive');
  if (values.length === 0) return [];

  const multiplier = 2 / (period + 1);
  const result: number[] = [];
  let previous = values[0];

  for (const value of values) {
    const current = value * multiplier + previous * (1 - multiplier);
    result.push(current);
    previous = current;
  }

  return result;
}

export function rsi(values: number[], period = 14): number[] {
  if (values.length <= period) return [];

  const result: number[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i += 1) {
    const change = values[i] - values[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < values.length; i += 1) {
    const change = values[i] - values[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }

  return result;
}

export function atr(candles: Candle[], period = 14): number[] {
  if (candles.length <= period) return [];

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const current = candles[i];
    const previous = candles[i - 1];
    const trueRange = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    trueRanges.push(trueRange);
  }

  return ema(trueRanges, period);
}

export function last<T>(items: T[]): T | undefined {
  return items[items.length - 1];
}
