import { env } from '../config/env.js';
import type { RiskPlan } from '../trading/types.js';

export function buildRiskPlan(params: {
  accountBalance: number;
  entryPrice: number;
  stopLoss: number;
  riskPercent?: number;
}): RiskPlan {
  const accountBalance = assertPositive(params.accountBalance, 'accountBalance');
  const entryPrice = assertPositive(params.entryPrice, 'entryPrice');
  const stopLoss = assertPositive(params.stopLoss, 'stopLoss');
  const riskPercent = params.riskPercent ?? env.DEFAULT_RISK_PERCENT;

  if (riskPercent <= 0 || riskPercent > 5) {
    throw new Error('riskPercent must be between 0 and 5. Keep risk small.');
  }

  const riskPerUnit = Math.abs(entryPrice - stopLoss);
  if (riskPerUnit <= 0) {
    throw new Error('entryPrice and stopLoss cannot be equal.');
  }

  const riskAmount = accountBalance * (riskPercent / 100);
  const positionSize = riskAmount / riskPerUnit;
  const notionalValue = positionSize * entryPrice;

  return {
    accountBalance,
    riskPercent,
    riskAmount,
    entryPrice,
    stopLoss,
    positionSize,
    notionalValue
  };
}

export function shouldStopTrading(params: {
  dailyLossPercent: number;
  consecutiveLosses: number;
  openTrades: number;
}): { stop: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (params.dailyLossPercent >= env.MAX_DAILY_LOSS_PERCENT) {
    reasons.push(`Daily loss limit reached: ${params.dailyLossPercent}%`);
  }

  if (params.consecutiveLosses >= env.MAX_CONSECUTIVE_LOSSES) {
    reasons.push(`Consecutive loss limit reached: ${params.consecutiveLosses}`);
  }

  if (params.openTrades >= env.MAX_OPEN_TRADES) {
    reasons.push(`Max open trades reached: ${params.openTrades}`);
  }

  return {
    stop: reasons.length > 0,
    reasons
  };
}

function assertPositive(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }

  return value;
}
