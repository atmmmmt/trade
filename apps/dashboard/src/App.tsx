import { useState } from 'react';

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
  const [loop, setLoop] = useState<ApiState<unknown>>({ loading: false, data: null, error: null });

  async function runSignal() {
    await run(setSignal, () => api(`/api/bot/signal?symbol=${symbol}&interval=${interval}&limit=150`));
  }

  async function runBacktest() {
    await run(setBacktest, () => api(`/api/lab/backtest?symbol=${symbol}&interval=${interval}&limit=500&startingBalance=1000&riskPercent=1`));
  }

  async function runPaperTick() {
    await run(setPaper, () => api('/api/lab/paper/tick', { method: 'POST', body: JSON.stringify({ symbol, interval, limit: 150, size: 0.001 }) }));
  }

  async function resetPaper() {
    await run(setPaper, () => api('/api/lab/paper/reset', { method: 'POST', body: JSON.stringify({ balance: 1000 }) }));
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setScanner((current) => ({ ...current, loading: false, error: message }));
      setSignal((current) => ({ ...current, loading: false, error: current.data ? null : message }));
      setBacktest((current) => ({ ...current, loading: false, error: current.data ? null : message }));
      setPaper((current) => ({ ...current, loading: false, error: current.data ? null : message }));
    }
  }

  async function startLoop() {
    await run(setLoop, () => api('/api/lab-loop/start', { method: 'POST', body: JSON.stringify({ interval, intervalSeconds: 60, top: 12, minQuoteVolume: 20000000, minConfidence: 80, minBacktestProfitPercent: 1, minBacktestTrades: 3, maxAbsMove24h: 22, size: 0.001 }) }));
  }

  async function stopLoop() {
    await run(setLoop, () => api('/api/lab-loop/stop', { method: 'POST' }));
  }

  async function runLoopOnce() {
    await run(setLoop, () => api('/api/lab-loop/run-once', { method: 'POST' }));
  }

  async function refreshLoop() {
    await run(setLoop, () => api('/api/lab-loop/status'));
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Smart Market Lab</p>
          <h1>Analysis, backtesting, and paper mode dashboard</h1>
          <p className="lead">This dashboard reads market data, generates strategy signals, scans liquid markets, and simulates results.</p>
        </div>
        <div className="status">Safe Mode</div>
      </section>

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
        <button onClick={refreshLoop} className="ghost">Refresh Loop</button>
      </section>

      <section className="grid five">
        <ResultCard title="Lab Loop" state={loop} />
        <ResultCard title="Best Market" state={scanner} />
        <ResultCard title="Signal" state={signal} />
        <ResultCard title="Backtest" state={backtest} />
        <ResultCard title="Paper Mode" state={paper} />
      </section>
    </main>
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
