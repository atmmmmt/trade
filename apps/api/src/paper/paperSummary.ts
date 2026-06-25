import { getFuturesCandles } from '../exchange/binanceFuturesTestnet.js';
import { getPaperAccount, getPaperStats } from './paperEngine.js';

export async function buildPaperSummary() {
  const account = getPaperAccount();
  const stats = getPaperStats();
  const open = account.positions.filter((item) => item.status === 'OPEN');
  const closed = account.positions.filter((item) => item.status === 'CLOSED');

  const openDetails = [];
  let unrealizedPnl = 0;

  for (const item of open) {
    let currentPrice = item.entryPrice;
    let candles = [] as Array<{ close: number }>;
    try {
      candles = await getFuturesCandles({ symbol: item.symbol, interval: '1m', limit: 60 });
      currentPrice = candles[candles.length - 1]?.close ?? item.entryPrice;
    } catch {
      currentPrice = item.entryPrice;
    }

    const pnl = item.side === 'BUY'
      ? (currentPrice - item.entryPrice) * item.size
      : (item.entryPrice - currentPrice) * item.size;

    unrealizedPnl += pnl;

    openDetails.push({
      ...item,
      currentPrice,
      unrealizedPnl: pnl,
      unrealizedPnlPercent: item.entryPrice > 0 ? (pnl / (item.entryPrice * item.size)) * 100 : 0,
      timeOpenSeconds: Math.max(0, Math.floor((Date.now() - new Date(item.openedAt).getTime()) / 1000)),
      estimatedCloseSeconds: estimateCloseSeconds(item, currentPrice, candles),
      nearestExit: nearestExit(item, currentPrice)
    });
  }

  const equity = account.balance + unrealizedPnl;
  const totalPnl = equity - account.startingBalance;
  const totalPnlPercent = account.startingBalance > 0 ? (totalPnl / account.startingBalance) * 100 : 0;
  const closedPnl = closed.reduce((sum, item) => sum + (item.pnl ?? 0), 0);
  const bestClosed = closed.reduce((best, item) => Math.max(best, item.pnl ?? 0), 0);
  const worstClosed = closed.reduce((worst, item) => Math.min(worst, item.pnl ?? 0), 0);

  const equityCurve = buildEquityCurve(account.startingBalance, closed, equity);

  return {
    startingBalance: account.startingBalance,
    balance: account.balance,
    equity,
    realizedPnl: closedPnl,
    unrealizedPnl,
    totalPnl,
    totalPnlPercent,
    wins: stats.wins,
    losses: stats.losses,
    winRate: stats.winRate,
    openCount: stats.openCount,
    closedCount: stats.closedCount,
    bestClosed,
    worstClosed,
    openPositions: openDetails,
    closedPositions: closed.slice(-20).reverse(),
    equityCurve,
    updatedAt: new Date().toISOString()
  };
}

function buildEquityCurve(startingBalance: number, closed: Array<{ pnl?: number; closedAt?: string }>, currentEquity: number) {
  let balance = startingBalance;
  const points = [{ label: 'Start', equity: startingBalance }];

  for (const item of closed) {
    balance += item.pnl ?? 0;
    points.push({ label: item.closedAt ?? '', equity: balance });
  }

  if (points.length === 1 || points[points.length - 1].equity !== currentEquity) {
    points.push({ label: 'Now', equity: currentEquity });
  }

  return points;
}

function estimateCloseSeconds(
  item: { side: 'BUY' | 'SELL'; stopLoss: number; takeProfit: number },
  currentPrice: number,
  candles: Array<{ close: number }>
): number | null {
  if (candles.length < 10) return null;

  const closeMoves: number[] = [];
  for (let index = 1; index < candles.length; index += 1) {
    closeMoves.push(Math.abs(candles[index].close - candles[index - 1].close));
  }

  const avgMovePerMinute = closeMoves.reduce((sum, value) => sum + value, 0) / closeMoves.length;
  if (!Number.isFinite(avgMovePerMinute) || avgMovePerMinute <= 0) return null;

  const exit = nearestExit(item, currentPrice);
  const distance = Math.abs(currentPrice - exit.price);
  const minutes = distance / avgMovePerMinute;
  const seconds = Math.round(minutes * 60);

  return Math.max(5, Math.min(seconds, 24 * 60 * 60));
}

function nearestExit(item: { side: 'BUY' | 'SELL'; stopLoss: number; takeProfit: number }, currentPrice: number) {
  const stopDistance = Math.abs(currentPrice - item.stopLoss);
  const targetDistance = Math.abs(currentPrice - item.takeProfit);

  if (targetDistance <= stopDistance) {
    return { type: 'TARGET', price: item.takeProfit, distance: targetDistance };
  }

  return { type: 'STOP', price: item.stopLoss, distance: stopDistance };
}
