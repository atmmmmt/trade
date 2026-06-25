import { getFutures24hTickers, getFuturesCandles, getFuturesExchangeSymbols, type KlineInterval } from '../exchange/binanceFuturesTestnet.js';
import { emaRsiAtrStrategy } from '../strategies/emaRsiAtrStrategy.js';

export type MarketCandidate = {
  symbol: string;
  lastPrice: number;
  priceChangePercent24h: number;
  quoteVolume24h: number;
  tradeCount24h: number;
  action: 'BUY' | 'SELL' | 'WAIT';
  confidence: number;
  trend?: 'UP' | 'DOWN' | 'SIDEWAYS';
  rsi?: number;
  atr?: number;
  score: number;
  reasons: string[];
};

export type MarketScanResult = {
  interval: string;
  scanned: number;
  best: MarketCandidate | null;
  candidates: MarketCandidate[];
  createdAt: string;
};

const excluded = new Set(['USDCUSDT', 'BUSDUSDT', 'TUSDUSDT', 'FDUSDUSDT', 'USDPUSDT', 'DAIUSDT']);

export async function scanBestMarket(params: {
  interval?: KlineInterval;
  limit?: number;
  top?: number;
  minQuoteVolume?: number;
}): Promise<MarketScanResult> {
  const interval = params.interval ?? '1m';
  const limit = params.limit ?? 120;
  const top = Math.min(Math.max(params.top ?? 12, 3), 30);
  const minQuoteVolume = params.minQuoteVolume ?? 20_000_000;

  const [symbols, tickers] = await Promise.all([
    getFuturesExchangeSymbols(),
    getFutures24hTickers()
  ]);

  const activeUsdtSymbols = new Set(
    symbols
      .filter((item) => item.status === 'TRADING')
      .filter((item) => item.contractType === 'PERPETUAL')
      .filter((item) => item.quoteAsset === 'USDT')
      .map((item) => item.symbol)
  );

  const preselected = tickers
    .filter((item) => activeUsdtSymbols.has(item.symbol))
    .filter((item) => item.symbol.endsWith('USDT'))
    .filter((item) => !excluded.has(item.symbol))
    .map((item) => ({
      symbol: item.symbol,
      lastPrice: Number(item.lastPrice),
      priceChangePercent24h: Math.abs(Number(item.priceChangePercent)),
      signedPriceChangePercent24h: Number(item.priceChangePercent),
      quoteVolume24h: Number(item.quoteVolume),
      tradeCount24h: Number(item.count)
    }))
    .filter((item) => Number.isFinite(item.lastPrice) && item.lastPrice > 0)
    .filter((item) => item.quoteVolume24h >= minQuoteVolume)
    .sort((a, b) => {
      const volumeRank = b.quoteVolume24h - a.quoteVolume24h;
      if (Math.abs(volumeRank) > 1_000_000) return volumeRank;
      return b.priceChangePercent24h - a.priceChangePercent24h;
    })
    .slice(0, top);

  const candidates: MarketCandidate[] = [];

  for (const item of preselected) {
    try {
      const candles = await getFuturesCandles({ symbol: item.symbol, interval, limit });
      const signal = emaRsiAtrStrategy({ symbol: item.symbol, interval, candles });
      const actionBonus = signal.action === 'WAIT' ? 0 : 30;
      const volumeScore = normalizeLog(item.quoteVolume24h, 1_000_000, 2_000_000_000) * 30;
      const movementScore = Math.min(item.priceChangePercent24h, 12) * 2;
      const confidenceScore = signal.confidence * 0.6;
      const score = Math.round(actionBonus + volumeScore + movementScore + confidenceScore);

      candidates.push({
        symbol: item.symbol,
        lastPrice: item.lastPrice,
        priceChangePercent24h: item.signedPriceChangePercent24h,
        quoteVolume24h: item.quoteVolume24h,
        tradeCount24h: item.tradeCount24h,
        action: signal.action,
        confidence: signal.confidence,
        trend: signal.indicators.trend,
        rsi: signal.indicators.rsi,
        atr: signal.indicators.atr,
        score,
        reasons: signal.reasons
      });
    } catch {
      continue;
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  return {
    interval,
    scanned: candidates.length,
    best: candidates[0] ?? null,
    candidates,
    createdAt: new Date().toISOString()
  };
}

function normalizeLog(value: number, min: number, max: number): number {
  const safeValue = Math.min(Math.max(value, min), max);
  const minLog = Math.log10(min);
  const maxLog = Math.log10(max);
  return (Math.log10(safeValue) - minLog) / (maxLog - minLog);
}
