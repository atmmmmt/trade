import { emaRsiAtrStrategy } from '../strategies/emaRsiAtrStrategy.js';
import type { Candle, TradingSide } from '../trading/types.js';

export type BacktestTrade = {
  side: TradingSide;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  reason: 'TARGET' | 'STOP' | 'END';
};

export type BacktestResult = {
  symbol: string;
  interval: string;
  startingBalance: number;
  endingBalance: number;
  totalPnl: number;
  totalPnlPercent: number;
  trades: BacktestTrade[];
  wins: number;
  losses: number;
  winRate: number;
  maxDrawdownPercent: number;
};

export function runBacktest(params: {
  symbol: string;
  interval: string;
  candles: Candle[];
  startingBalance?: number;
  riskPercent?: number;
}): BacktestResult {
  const startingBalance = params.startingBalance ?? 1000;
  const riskPercent = params.riskPercent ?? 1;
  let balance = startingBalance;
  let peak = startingBalance;
  let maxDrawdownPercent = 0;
  const trades: BacktestTrade[] = [];

  let open: null | {
    side: TradingSide;
    entryTime: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    size: number;
  } = null;

  for (let i = 60; i < params.candles.length; i += 1) {
    const candle = params.candles[i];

    if (open) {
      const hitStop = open.side === 'BUY' ? candle.low <= open.stopLoss : candle.high >= open.stopLoss;
      const hitTarget = open.side === 'BUY' ? candle.high >= open.takeProfit : candle.low <= open.takeProfit;

      if (hitStop || hitTarget) {
        const exitPrice = hitTarget ? open.takeProfit : open.stopLoss;
        const pnl = open.side === 'BUY'
          ? (exitPrice - open.entryPrice) * open.size
          : (open.entryPrice - exitPrice) * open.size;

        balance += pnl;
        peak = Math.max(peak, balance);
        const drawdown = ((peak - balance) / peak) * 100;
        maxDrawdownPercent = Math.max(maxDrawdownPercent, drawdown);

        trades.push({
          side: open.side,
          entryTime: open.entryTime,
          exitTime: candle.closeTime,
          entryPrice: open.entryPrice,
          exitPrice,
          pnl,
          reason: hitTarget ? 'TARGET' : 'STOP'
        });

        open = null;
      }
    }

    if (!open) {
      const signal = emaRsiAtrStrategy({
        symbol: params.symbol,
        interval: params.interval,
        candles: params.candles.slice(0, i + 1)
      });

      if (signal.action !== 'WAIT' && signal.suggestedRisk) {
        const riskAmount = balance * (riskPercent / 100);
        const riskPerUnit = Math.abs(signal.price - signal.suggestedRisk.stopLoss);
        const size = riskPerUnit > 0 ? riskAmount / riskPerUnit : 0;

        if (size > 0) {
          open = {
            side: signal.action,
            entryTime: candle.closeTime,
            entryPrice: signal.price,
            stopLoss: signal.suggestedRisk.stopLoss,
            takeProfit: signal.suggestedRisk.takeProfit,
            size
          };
        }
      }
    }
  }

  const wins = trades.filter((trade) => trade.pnl > 0).length;
  const losses = trades.filter((trade) => trade.pnl < 0).length;
  const totalPnl = balance - startingBalance;

  return {
    symbol: params.symbol,
    interval: params.interval,
    startingBalance,
    endingBalance: balance,
    totalPnl,
    totalPnlPercent: (totalPnl / startingBalance) * 100,
    trades,
    wins,
    losses,
    winRate: trades.length === 0 ? 0 : (wins / trades.length) * 100,
    maxDrawdownPercent
  };
}
