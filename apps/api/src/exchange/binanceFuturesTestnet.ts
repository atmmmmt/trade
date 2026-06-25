import axios from 'axios';
import { env } from '../config/env.js';
import type { Candle } from '../trading/types.js';

const client = axios.create({
  baseURL: env.BINANCE_FUTURES_TESTNET_BASE_URL,
  timeout: 10_000
});

export type KlineInterval =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '4h'
  | '1d';

export type FuturesTicker24h = {
  symbol: string;
  priceChangePercent: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  count: number;
};

export type FuturesSymbolInfo = {
  symbol: string;
  pair: string;
  contractType: string;
  status: string;
  quoteAsset: string;
  marginAsset: string;
};

export async function getFuturesCandles(params: {
  symbol: string;
  interval: KlineInterval;
  limit?: number;
}): Promise<Candle[]> {
  const symbol = params.symbol.toUpperCase();
  const limit = Math.min(Math.max(params.limit ?? 150, 50), 500);

  const response = await client.get<unknown[]>('/fapi/v1/klines', {
    params: {
      symbol,
      interval: params.interval,
      limit
    }
  });

  return response.data.map((row) => {
    const item = row as [number, string, string, string, string, string, number];
    return {
      openTime: Number(item[0]),
      open: Number(item[1]),
      high: Number(item[2]),
      low: Number(item[3]),
      close: Number(item[4]),
      volume: Number(item[5]),
      closeTime: Number(item[6])
    } satisfies Candle;
  });
}

export async function getFutures24hTickers(): Promise<FuturesTicker24h[]> {
  const response = await client.get<FuturesTicker24h[]>('/fapi/v1/ticker/24hr');
  return response.data;
}

export async function getFuturesExchangeSymbols(): Promise<FuturesSymbolInfo[]> {
  const response = await client.get<{ symbols: FuturesSymbolInfo[] }>('/fapi/v1/exchangeInfo');
  return response.data.symbols;
}
