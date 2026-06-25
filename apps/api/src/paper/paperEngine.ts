import type { StrategySignal, TradingSide } from '../trading/types.js';

export type PaperPosition = {
  id: string;
  symbol: string;
  side: TradingSide;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  size: number;
  openedAt: string;
  status: 'OPEN' | 'CLOSED';
  exitPrice?: number;
  closedAt?: string;
  pnl?: number;
  closeReason?: string;
};

export type PaperAccount = {
  balance: number;
  startingBalance: number;
  positions: PaperPosition[];
};

const account: PaperAccount = {
  balance: 1000,
  startingBalance: 1000,
  positions: []
};

export function getPaperAccount(): PaperAccount {
  return account;
}

export function resetPaperAccount(balance = 1000): PaperAccount {
  account.balance = balance;
  account.startingBalance = balance;
  account.positions = [];
  return account;
}

export function openPaperPosition(signal: StrategySignal, size = 0.001): PaperPosition | null {
  if (signal.action === 'WAIT' || !signal.suggestedRisk) return null;

  const alreadyOpen = account.positions.some((position) => position.status === 'OPEN' && position.symbol === signal.symbol);
  if (alreadyOpen) return null;

  const position: PaperPosition = {
    id: crypto.randomUUID(),
    symbol: signal.symbol,
    side: signal.action,
    entryPrice: signal.price,
    stopLoss: signal.suggestedRisk.stopLoss,
    takeProfit: signal.suggestedRisk.takeProfit,
    size,
    openedAt: new Date().toISOString(),
    status: 'OPEN'
  };

  account.positions.push(position);
  return position;
}

export function evaluatePaperPositions(symbol: string, currentPrice: number): PaperPosition[] {
  const changed: PaperPosition[] = [];

  for (const position of account.positions) {
    if (position.status !== 'OPEN' || position.symbol !== symbol) continue;

    const hitStop = position.side === 'BUY'
      ? currentPrice <= position.stopLoss
      : currentPrice >= position.stopLoss;

    const hitTarget = position.side === 'BUY'
      ? currentPrice >= position.takeProfit
      : currentPrice <= position.takeProfit;

    if (!hitStop && !hitTarget) continue;

    const pnl = position.side === 'BUY'
      ? (currentPrice - position.entryPrice) * position.size
      : (position.entryPrice - currentPrice) * position.size;

    position.status = 'CLOSED';
    position.exitPrice = currentPrice;
    position.closedAt = new Date().toISOString();
    position.pnl = pnl;
    position.closeReason = hitTarget ? 'TARGET' : 'STOP';
    account.balance += pnl;
    changed.push(position);
  }

  return changed;
}

export function getPaperStats() {
  const closed = account.positions.filter((position) => position.status === 'CLOSED');
  const wins = closed.filter((position) => (position.pnl ?? 0) > 0).length;
  const losses = closed.filter((position) => (position.pnl ?? 0) < 0).length;
  const totalPnl = account.balance - account.startingBalance;
  const winRate = closed.length === 0 ? 0 : (wins / closed.length) * 100;

  return {
    startingBalance: account.startingBalance,
    balance: account.balance,
    totalPnl,
    totalPnlPercent: (totalPnl / account.startingBalance) * 100,
    closedCount: closed.length,
    openCount: account.positions.length - closed.length,
    wins,
    losses,
    winRate
  };
}
