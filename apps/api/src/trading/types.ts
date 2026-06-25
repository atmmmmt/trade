export type TradingSide = 'BUY' | 'SELL';
export type SignalAction = TradingSide | 'WAIT';

export type Candle = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

export type StrategySignal = {
  action: SignalAction;
  symbol: string;
  interval: string;
  price: number;
  confidence: number;
  reasons: string[];
  indicators: {
    emaFast?: number;
    emaSlow?: number;
    rsi?: number;
    atr?: number;
    trend?: 'UP' | 'DOWN' | 'SIDEWAYS';
  };
  suggestedRisk?: {
    stopLoss: number;
    takeProfit: number;
    riskReward: number;
  };
  createdAt: string;
};

export type RiskPlan = {
  accountBalance: number;
  riskPercent: number;
  riskAmount: number;
  entryPrice: number;
  stopLoss: number;
  positionSize: number;
  notionalValue: number;
};
