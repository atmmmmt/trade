import { useEffect, useState } from 'react';

type ApiState<T> = {
  loading: boolean;
  data: T | null;
  error: string | null;
};

type ScanResponse = {
  ok: boolean;
  data: {
    best: null | { symbol: string; score: number; action: string; confidence: number };
    candidates: Array<{ symbol: string; score: number; action: string; confidence: number }>;
  };
};

type LabLoopResponse = {
  ok: boolean;
  data: {
    enabled?: boolean;
    running?: boolean;
    runs?: number;
    lastResult?: {
      symbol?: string;
      signal?: unknown;
      backtest?: unknown;
      recorded?: unknown;
      updated?: unknown[];
    } | null;
    account?: unknown;
    stats?: unknown;
  };
};

type PaperPosition = {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice?: number;
  stopLoss: number;
  takeProfit: number;
  size: number;
  status: 'OPEN' | 'CLOSED';
  pnl?: number;
  unrealizedPnl?: number;
  unrealizedPnlPercent?: number;
  closeReason?: string;
  openedAt?: string;
  closedAt?: string;
};

type PaperSummary = {
  startingBalance: number;
  balance: number;
  equity: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  totalPnlPercent: number;
  wins: number;
  losses: number;
  winRate: number;
  openCount: number;
  closedCount: number;
  bestClosed: number;
  worstClosed: number;
  openPositions: PaperPosition[];
  closedPositions: PaperPosition[];
  equityCurve: Array<{ label: string; equity: number }>;
  updatedAt: string;
};

const defaultSymbol = 'BTCUSDT';
const defaultInterval = '1m';

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  const json = await response.json();
  if (!response.ok || json.ok === false) throw new Error(json.error ?? 'Request failed');
  return json as T;
}

export function App() {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [interval, setIntervalValue] = useState(defaultInterval);
  const [signal, setSignal] = useState<ApiState<unknown>>({ loading: false, data: null, error: null });
  const [backtest, setBacktest] = useState<ApiState<unknown>>({ loading: false, data: null, error: null });
  const [paper, setPaper] = useState<ApiState<unknown>>({ loading: false, data: null, error: null });
  const [scanner, setScanner] = useState<ApiState<unknown>>({ loading: false, data: null, error: null });
  const [loop, setLoop] = useState<ApiState<LabLoopResponse>>({ loading: false, data: null, error: null });
  const [summary, setSummary] = useState<ApiState<PaperSummary>>({ loading: false, data: null, error: null });

  useEffect(() => {
    void refreshSummary(false);
    void refreshLoop(false);
    const summaryTimer = window.setInterval(() => void refreshSummary(false), 5_000);
    const loopTimer = window.setInterval(() => void refreshLoop(false), 10_000);
    return () => {
      window.clearInterval(summaryTimer);
      window.clearInterval(loopTimer);
    };
  }, []);

  function syncLoopCards(response: LabLoopResponse) {
    const result = response.data.lastResult;
    if (!result) return;
    if (result.symbol) setSymbol(result.symbol);
    if (result.signal) setSignal({ loading: false, data: { ok: true, data: result.signal }, error: null });
    if (result.backtest) setBacktest({ loading: false, data: { ok: true, data: result.backtest }, error: null });
    if (result.recorded || result.updated || response.data.account || response.data.stats) {
      setPaper({ loading: false, data: { ok: true, recorded: result.recorded, updated: result.updated, account: response.data.account, stats: response.data.stats }, error: null });
    }
    void refreshSummary(false);
  }

  async function refreshSummary(showLoading = true) {
    const load = async () => {
      const response = await api<{ ok: boolean; data: PaperSummary }>('/api/lab/paper/summary');
      return response.data;
    };

    if (showLoading) {
      await run(setSummary, load);
      return;
    }

    try {
      const data = await load();
      setSummary({ loading: false, data, error: null });
    } catch {
      // silent background refresh failure
    }
  }

  async function runSignal() {
    await run(setSignal, () => api(`/api/bot/signal?symbol=${symbol}&interval=${interval}&limit=150`));
  }

  async function runBacktest() {
    await run(setBacktest, () => api(`/api/lab/backtest?symbol=${symbol}&interval=${interval}&limit=500&startingBalance=1000&riskPercent=1`));
  }

  async function runPaperTick() {
    await run(setPaper, () => api('/api/lab/paper/tick', { method: 'POST', body: JSON.stringify({ symbol, interval, limit: 150, size: 0.001 }) }));
    await refreshSummary(false);
  }

  async function resetPaper() {
    await run(setPaper, () => api('/api/lab/paper/reset', { method: 'POST', body: JSON.stringify({ balance: 1000 }) }));
    await refreshSummary(false);
  }

  async function findBestMarket() {
    setScanner({ loading: true, data: null, error: null });
    setSignal({ loading: true, data: null, error: null });
    setBacktest({ loading: true, data: null, error: null });
    setPaper({ loading: true, data: null, error: null });

    try {
      const scan = await api<ScanResponse>(`/api/scanner/best?interval=${interval}&top=12&limit=120&minQuoteVolume=20000000`);
      const bestSymbol = scan.data.best?.symbol ?? symbol;
      setSymbol(bestSymbol);
      setScanner({ loading: false, data: scan, error: null });

      const [signalData, backtestData, paperData] = await Promise.all([
        api(`/api/bot/signal?symbol=${bestSymbol}&interval=${interval}&limit=150`),
        api(`/api/lab/backtest?symbol=${bestSymbol}&interval=${interval}&limit=500&startingBalance=1000&riskPercent=1`),
        api('/api/lab/paper/tick', { method: 'POST', body: JSON.stringify({ symbol: bestSymbol, interval, limit: 150, size: 0.001 }) })
      ]);

      setSignal({ loading: false, data: signalData, error: null });
      setBacktest({ loading: false, data: backtestData, error: null });
      setPaper({ loading: false, data: paperData, error: null });
      await refreshSummary(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setScanner((current) => ({ ...current, loading: false, error: message }));
      setSignal((current) => ({ ...current, loading: false, error: current.data ? null : message }));
      setBacktest((current) => ({ ...current, loading: false, error: current.data ? null : message }));
      setPaper((current) => ({ ...current, loading: false, error: current.data ? null : message }));
    }
  }

  async function startLoop() {
    await run(setLoop, async () => {
      const response = await api<LabLoopResponse>('/api/lab-loop/start', { method: 'POST', body: JSON.stringify({ interval, intervalSeconds: 60, top: 12, minQuoteVolume: 20000000, minConfidence: 80, minBacktestProfitPercent: 1, minBacktestTrades: 3, maxAbsMove24h: 22, size: 0.001 }) });
      syncLoopCards(response);
      return response;
    });
  }

  async function stopLoop() {
    await run(setLoop, () => api('/api/lab-loop/stop', { method: 'POST' }));
  }

  async function runLoopOnce() {
    await run(setLoop, async () => {
      const response = await api<LabLoopResponse>('/api/lab-loop/run-once', { method: 'POST' });
      syncLoopCards(response);
      return response;
    });
  }

  async function refreshLoop(showLoading = true) {
    if (showLoading) {
      await run(setLoop, async () => {
        const response = await api<LabLoopResponse>('/api/lab-loop/status');
        syncLoopCards(response);
        return response;
      });
      return;
    }

    try {
      const response = await api<LabLoopResponse>('/api/lab-loop/status');
      setLoop({ loading: false, data: response, error: null });
      syncLoopCards(response);
    } catch {
      // Silent background refresh failure.
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Smart Market Lab</p>
          <h1>Simulation dashboard</h1>
          <p className="lead">Market scanner, strategy checks, backtests, paper-mode performance boxes, and account analytics.</p>
        </div>
        <div className="status">Safe Mode</div>
      </section>

      <SummaryPanel state={summary} />

      <section className="controls card">
        <label>Symbol<input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} /></label>
        <label>Interval<select value={interval} onChange={(event) => setIntervalValue(event.target.value)}>{['1m', '3m', '5m', '15m', '30m', '1h', '4h'].map((item) => <option key={item}>{item}</option>)}</select></label>
        <button onClick={findBestMarket}>Find Best + Auto Test</button>
        <button onClick={runSignal}>Run Signal</button>
        <button onClick={runBacktest}>Run Backtest</button>
        <button onClick={runPaperTick}>Paper Tick</button>
        <button className="ghost" onClick={resetPaper}>Reset Paper</button>
      </section>

      <section className="controls card loop-controls">
        <button onClick={startLoop}>Start Lab Loop</button>
        <button onClick={stopLoop} className="ghost">Stop Lab Loop</button>
        <button onClick={runLoopOnce}>Run Loop Once</button>
        <button onClick={() => void refreshLoop(true)} className="ghost">Refresh Loop</button>
        <button onClick={() => void refreshSummary(true)} className="ghost">Refresh P/L</button>
      </section>

      <section className="dashboard-grid">
        <PerformanceCard summary={summary.data} />
        <PositionsCard title="Open Positions" positions={summary.data?.openPositions ?? []} empty="No open paper positions." />
        <PositionsCard title="Closed Positions" positions={summary.data?.closedPositions ?? []} empty="No closed paper positions yet." />
      </section>

      <section className="grid five diagnostics">
        <ResultCard title="Lab Loop Raw" state={loop} />
        <ResultCard title="Best Market Raw" state={scanner} />
        <ResultCard title="Signal Raw" state={signal} />
        <ResultCard title="Backtest Raw" state={backtest} />
        <ResultCard title="Paper Raw" state={paper} />
      </section>
    </main>
  );
}

function SummaryPanel(props: { state: ApiState<PaperSummary> }) {
  const s = props.state.data;
  return (
    <section className="summary-grid">
      <StatCard label="Equity" value={fmtMoney(s?.equity)} hint="Balance + open P/L" tone="neutral" />
      <StatCard label="Total P/L" value={fmtMoney(s?.totalPnl)} hint={fmtPct(s?.totalPnlPercent)} tone={tone(s?.totalPnl)} />
      <StatCard label="Realized P/L" value={fmtMoney(s?.realizedPnl)} hint="Closed results" tone={tone(s?.realizedPnl)} />
      <StatCard label="Open P/L" value={fmtMoney(s?.unrealizedPnl)} hint="Running positions" tone={tone(s?.unrealizedPnl)} />
      <StatCard label="Win Rate" value={fmtPct(s?.winRate)} hint={`${s?.wins ?? 0}W / ${s?.losses ?? 0}L`} tone="neutral" />
      <StatCard label="Positions" value={`${s?.openCount ?? 0} open`} hint={`${s?.closedCount ?? 0} closed`} tone="neutral" />
    </section>
  );
}

function StatCard(props: { label: string; value: string; hint: string; tone: 'positive' | 'negative' | 'neutral' }) {
  return <article className={`stat-card ${props.tone}`}><p>{props.label}</p><strong>{props.value}</strong><span>{props.hint}</span></article>;
}

function PerformanceCard(props: { summary?: PaperSummary | null }) {
  return (
    <article className="card panel-card wide-card">
      <div className="panel-head"><h2>Performance Chart</h2><span>{props.summary?.updatedAt ? new Date(props.summary.updatedAt).toLocaleTimeString() : 'Waiting'}</span></div>
      <EquityChart points={props.summary?.equityCurve ?? []} />
      <div className="chart-footer">
        <span>Start: {fmtMoney(props.summary?.startingBalance)}</span>
        <span>Balance: {fmtMoney(props.summary?.balance)}</span>
        <span>Best: {fmtMoney(props.summary?.bestClosed)}</span>
        <span>Worst: {fmtMoney(props.summary?.worstClosed)}</span>
      </div>
    </article>
  );
}

function EquityChart(props: { points: Array<{ equity: number }> }) {
  const points = props.points.length >= 2 ? props.points : [{ equity: 1000 }, { equity: 1000 }];
  const values = points.map((point) => point.equity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const width = 620;
  const height = 180;
  const path = points.map((point, index) => {
    const x = points.length === 1 ? 0 : (index / (points.length - 1)) * width;
    const y = height - ((point.equity - min) / range) * height;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');

  return <svg className="equity-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"><path d={path} /></svg>;
}

function PositionsCard(props: { title: string; positions: PaperPosition[]; empty: string }) {
  return (
    <article className="card panel-card">
      <div className="panel-head"><h2>{props.title}</h2><span>{props.positions.length}</span></div>
      {props.positions.length === 0 ? <p className="muted">{props.empty}</p> : <div className="positions-list">{props.positions.map((position) => <PositionRow key={position.id} position={position} />)}</div>}
    </article>
  );
}

function PositionRow(props: { position: PaperPosition }) {
  const p = props.position;
  const pnl = p.status === 'OPEN' ? p.unrealizedPnl : p.pnl;
  return (
    <div className="position-row">
      <div><strong>{p.symbol}</strong><span>{p.side} · {p.status}</span></div>
      <div><span>Entry</span><strong>{num(p.entryPrice)}</strong></div>
      <div><span>Now/Exit</span><strong>{num(p.currentPrice ?? p.entryPrice)}</strong></div>
      <div><span>P/L</span><strong className={pnl && pnl < 0 ? 'loss-text' : 'win-text'}>{fmtMoney(pnl)}</strong></div>
      <div><span>Reason</span><strong>{p.closeReason ?? '-'}</strong></div>
    </div>
  );
}

function ResultCard(props: { title: string; state: ApiState<unknown> }) {
  return <article className="card result"><h2>{props.title}</h2>{props.state.loading && <p>Loading...</p>}{props.state.error && <p className="error">{props.state.error}</p>}{props.state.data && <pre>{JSON.stringify(props.state.data, null, 2)}</pre>}{!props.state.loading && !props.state.error && !props.state.data && <p className="muted">No data yet.</p>}</article>;
}

async function run<T>(setState: (state: ApiState<T>) => void, fn: () => Promise<T>) {
  setState({ loading: true, data: null, error: null });
  try {
    const data = await fn();
    setState({ loading: false, data, error: null });
  } catch (error) {
    setState({ loading: false, data: null, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

function fmtMoney(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '$0.00';
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(4)}`;
}

function fmtPct(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0.00%';
  return `${value.toFixed(2)}%`;
}

function num(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return value < 1 ? value.toFixed(6) : value.toFixed(3);
}

function tone(value?: number): 'positive' | 'negative' | 'neutral' {
  if (!value) return 'neutral';
  return value > 0 ? 'positive' : 'negative';
}
