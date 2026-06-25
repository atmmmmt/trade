import { useState } from 'react';

type ApiState<T> = {
  loading: boolean;
  data: T | null;
  error: string | null;
};

const defaultSymbol = 'BTCUSDT';
const defaultInterval = '1m';

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
  const json = await response.json();
  if (!response.ok || json.ok === false) {
    throw new Error(json.error ?? 'Request failed');
  }
  return json as T;
}

export function App() {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [interval, setIntervalValue] = useState(defaultInterval);
  const [signal, setSignal] = useState<ApiState<unknown>>({ loading: false, data: null, error: null });
  const [backtest, setBacktest] = useState<ApiState<unknown>>({ loading: false, data: null, error: null });
  const [paper, setPaper] = useState<ApiState<unknown>>({ loading: false, data: null, error: null });

  async function runSignal() {
    await run(setSignal, () => api(`/api/bot/signal?symbol=${symbol}&interval=${interval}&limit=150`));
  }

  async function runBacktest() {
    await run(setBacktest, () => api(`/api/lab/backtest?symbol=${symbol}&interval=${interval}&limit=500&startingBalance=1000&riskPercent=1`));
  }

  async function runPaperTick() {
    await run(setPaper, () => api('/api/lab/paper/tick', {
      method: 'POST',
      body: JSON.stringify({ symbol, interval, limit: 150, size: 0.001 })
    }));
  }

  async function resetPaper() {
    await run(setPaper, () => api('/api/lab/paper/reset', {
      method: 'POST',
      body: JSON.stringify({ balance: 1000 })
    }));
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Smart Market Lab</p>
          <h1>Analysis, backtesting, and paper mode dashboard</h1>
          <p className="lead">
            This dashboard is built for testing only. It reads market data, generates strategy signals,
            and simulates results without touching real funds.
          </p>
        </div>
        <div className="status">Safe Mode</div>
      </section>

      <section className="controls card">
        <label>
          Symbol
          <input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} />
        </label>
        <label>
          Interval
          <select value={interval} onChange={(event) => setIntervalValue(event.target.value)}>
            {['1m', '3m', '5m', '15m', '30m', '1h', '4h'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <button onClick={runSignal}>Run Signal</button>
        <button onClick={runBacktest}>Run Backtest</button>
        <button onClick={runPaperTick}>Paper Tick</button>
        <button className="ghost" onClick={resetPaper}>Reset Paper</button>
      </section>

      <section className="grid">
        <ResultCard title="Signal" state={signal} />
        <ResultCard title="Backtest" state={backtest} />
        <ResultCard title="Paper Mode" state={paper} />
      </section>
    </main>
  );
}

function ResultCard(props: { title: string; state: ApiState<unknown> }) {
  return (
    <article className="card result">
      <h2>{props.title}</h2>
      {props.state.loading && <p>Loading...</p>}
      {props.state.error && <p className="error">{props.state.error}</p>}
      {props.state.data && <pre>{JSON.stringify(props.state.data, null, 2)}</pre>}
      {!props.state.loading && !props.state.error && !props.state.data && <p className="muted">No data yet.</p>}
    </article>
  );
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
