import { useEffect, useState } from 'react';

type LoopResponse = { ok: boolean; data: { enabled?: boolean; running?: boolean; runs?: number; nextRunAt?: string | null } };
type PaperPosition = { id: string; symbol: string; side: 'BUY' | 'SELL'; entryPrice: number; currentPrice?: number; status: 'OPEN' | 'CLOSED'; pnl?: number; unrealizedPnl?: number; closeReason?: string };
type PaperSummary = { startingBalance: number; balance: number; equity: number; realizedPnl: number; unrealizedPnl: number; totalPnl: number; totalPnlPercent: number; wins: number; losses: number; winRate: number; openCount: number; closedCount: number; bestClosed: number; worstClosed: number; openPositions: PaperPosition[]; closedPositions: PaperPosition[]; equityCurve: Array<{ equity: number }>; updatedAt: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  const json = await response.json();
  if (!response.ok || json.ok === false) throw new Error(json.error ?? 'Request failed');
  return json as T;
}

function numberFromStorage(key: string, fallback: number) {
  const value = Number(localStorage.getItem(key) ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function App() {
  const [capital, setCapital] = useState(numberFromStorage('auto-capital-usd', 20));
  const [budget, setBudget] = useState(numberFromStorage('auto-budget-usd', 5));
  const [position, setPosition] = useState(numberFromStorage('auto-position-usd', 5));
  const [interval, setIntervalValue] = useState(localStorage.getItem('auto-interval') ?? '1m');
  const [loop, setLoop] = useState<LoopResponse | null>(null);
  const [summary, setSummary] = useState<PaperSummary | null>(null);
  const [message, setMessage] = useState('جاهز للتشغيل');
  const [busy, setBusy] = useState(false);

  const active = loop?.data.enabled === true;

  useEffect(() => {
    void refreshAll();
    const id = window.setInterval(() => void refreshAll(), 10_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => void guardBudget(), 15_000);
    return () => window.clearInterval(id);
  }, [active, budget]);

  async function refreshLoop() {
    const data = await api<LoopResponse>('/api/lab-loop/status');
    setLoop(data);
    return data;
  }

  async function refreshSummary() {
    const data = await api<{ ok: boolean; data: PaperSummary }>('/api/lab/paper/summary');
    setSummary(data.data);
    return data.data;
  }

  async function refreshAll() {
    try {
      await Promise.all([refreshLoop(), refreshSummary()]);
    } catch {
      setMessage('تعذر تحديث البيانات مؤقتًا');
    }
  }

  function saveSettings() {
    localStorage.setItem('auto-capital-usd', String(capital));
    localStorage.setItem('auto-budget-usd', String(budget));
    localStorage.setItem('auto-position-usd', String(position));
    localStorage.setItem('auto-interval', interval);
  }

  async function startAuto() {
    setBusy(true);
    setMessage('جاري التشغيل...');
    try {
      saveSettings();
      await api('/api/lab/paper/reset', { method: 'POST', body: JSON.stringify({ balance: capital }) });
      const response = await api<LoopResponse>('/api/lab-loop/start', {
        method: 'POST',
        body: JSON.stringify({
          interval,
          intervalSeconds: 30,
          top: 12,
          minQuoteVolume: 8000000,
          minConfidence: 60,
          minBacktestProfitPercent: 0,
          minBacktestTrades: 1,
          minWinRate: 0,
          maxDrawdownPercent: 30,
          maxAbsMove24h: 70,
          maxOpenPositions: 4,
          maxPositionNotional: position,
          riskPercent: 1,
          commissionRate: 0.0004,
          slippageRate: 0.0002,
          size: 0
        })
      });
      setLoop(response);
      setMessage('النظام الآلي شغال');
      await refreshSummary();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'فشل التشغيل');
    } finally {
      setBusy(false);
    }
  }

  async function stopAuto() {
    setBusy(true);
    try {
      const response = await api<LoopResponse>('/api/lab-loop/stop', { method: 'POST' });
      setLoop(response);
      setMessage('تم إيقاف النظام');
    } finally {
      setBusy(false);
    }
  }

  async function resetAll() {
    setBusy(true);
    setMessage('جاري التصفير...');
    try {
      saveSettings();
      await api('/api/lab-loop/stop', { method: 'POST' }).catch(() => undefined);
      await api('/api/lab/paper/reset', { method: 'POST', body: JSON.stringify({ balance: capital }) });
      await refreshAll();
      setMessage(`تم تصفير التجربة إلى ${capital}$`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'فشل التصفير');
    } finally {
      setBusy(false);
    }
  }

  async function guardBudget() {
    try {
      const data = await refreshSummary();
      if (data.equity <= data.startingBalance - budget) {
        await api('/api/lab/paper/close-all', { method: 'POST' }).catch(() => undefined);
        await stopAuto();
        setMessage(`توقف لحماية الرصيد: حد الإيقاف ${budget}$`);
      }
    } catch {
      // ignore temporary refresh errors
    }
  }

  return <main className="page" dir="rtl">
    <section className="hero"><div><p className="eyebrow">مختبر السوق الذكي</p><h1>لوحة المحاكاة والتحليل</h1><p className="lead">واجهة خفيفة للتجربة الورقية: رأس مال محدد، حد إيقاف، وأقصى صفقة.</p></div><div className="status">Paper Mode</div></section>

    <section className="summary-grid">
      <Stat label="قيمة الحساب" value={money(summary?.equity)} hint="الرصيد + المفتوح" tone="neutral" />
      <Stat label="إجمالي الربح/الخسارة" value={money(summary?.totalPnl)} hint={pct(summary?.totalPnlPercent)} tone={tone(summary?.totalPnl)} />
      <Stat label="الربح المحقق" value={money(summary?.realizedPnl)} hint="صفقات مغلقة" tone={tone(summary?.realizedPnl)} />
      <Stat label="الربح المفتوح" value={money(summary?.unrealizedPnl)} hint="صفقات حالية" tone={tone(summary?.unrealizedPnl)} />
      <Stat label="نسبة الفوز" value={pct(summary?.winRate)} hint={`${summary?.wins ?? 0}W / ${summary?.losses ?? 0}L`} tone="neutral" />
      <Stat label="الصفقات" value={`open ${summary?.openCount ?? 0}`} hint={`closed ${summary?.closedCount ?? 0}`} tone="neutral" />
    </section>

    <section className={`auto-panel ${active ? 'is-active' : ''}`}>
      <div><strong>{active ? 'النظام الآلي شغال' : 'النظام الآلي متوقف'}</strong><span>{message}</span></div>
      <label>رأس مال البوت $<input disabled={active || busy} type="number" min="5" value={capital} onChange={(e) => setCapital(Number(e.target.value))} /></label>
      <label>حد الإيقاف $<input disabled={active || busy} type="number" min="1" value={budget} onChange={(e) => setBudget(Number(e.target.value))} /></label>
      <label>أقصى صفقة $<input disabled={active || busy} type="number" min="1" value={position} onChange={(e) => setPosition(Number(e.target.value))} /></label>
      <label>الفريم<select disabled={active || busy} value={interval} onChange={(e) => setIntervalValue(e.target.value)}><option>1m</option><option>3m</option><option>5m</option><option>15m</option></select></label>
      {active ? <button className="danger" disabled={busy} onClick={stopAuto}>إيقاف النظام</button> : <button className="active-on" disabled={busy} onClick={startAuto}>تشغيل النظام الآلي</button>}
      <button className="ghost" disabled={busy || active} onClick={resetAll}>تصفير كل شيء</button>
    </section>

    <section className={`loop-state-card ${active ? 'is-active' : 'is-inactive'}`}><div><span className="state-dot" /><strong>{active ? 'Monitoring ON' : 'Monitoring OFF'}</strong><small>{loop?.data.running ? 'running now' : 'standing by'}</small></div><div><span>Runs</span><strong>{loop?.data.runs ?? 0}</strong></div><div><span>Next</span><strong>{loop?.data.nextRunAt ? new Date(loop.data.nextRunAt).toLocaleTimeString() : '-'}</strong></div></section>

    <section className="dashboard-grid"><Chart points={summary?.equityCurve ?? []} /><Positions title="الصفقات المفتوحة" positions={summary?.openPositions ?? []} empty="لا توجد صفقات مفتوحة." /><Positions title="الصفقات المغلقة" positions={summary?.closedPositions ?? []} empty="لا توجد صفقات مغلقة." /></section>
  </main>;
}

function Stat(props: { label: string; value: string; hint: string; tone: 'positive' | 'negative' | 'neutral' }) { return <article className={`stat-card ${props.tone}`}><p>{props.label}</p><strong>{props.value}</strong><span>{props.hint}</span></article>; }
function Chart(props: { points: Array<{ equity: number }> }) { const points = props.points.length > 1 ? props.points : [{ equity: 20 }, { equity: 20 }]; const values = points.map((p) => p.equity); const min = Math.min(...values); const max = Math.max(...values); const range = Math.max(max - min, 1); const path = points.map((p, i) => { const x = (i / Math.max(points.length - 1, 1)) * 620; const y = 180 - ((p.equity - min) / range) * 180; return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`; }).join(' '); return <article className="card panel-card wide-card"><div className="panel-head"><h2>شارت الأداء</h2></div><svg className="equity-chart" viewBox="0 0 620 180" preserveAspectRatio="none"><path d={path} /></svg></article>; }
function Positions(props: { title: string; positions: PaperPosition[]; empty: string }) { return <article className="card panel-card"><div className="panel-head"><h2>{props.title}</h2><span>{props.positions.length}</span></div>{props.positions.length === 0 ? <p className="muted">{props.empty}</p> : <div className="positions-list">{props.positions.slice(0, 10).map((p) => <div className="position-row" key={p.id}><div><strong>{p.symbol}</strong><span>{p.side} · {p.status}</span></div><div><span>الدخول</span><strong>{num(p.entryPrice)}</strong></div><div><span>الحالي</span><strong>{num(p.currentPrice ?? p.entryPrice)}</strong></div><div><span>صافي</span><strong className={(p.status === 'OPEN' ? p.unrealizedPnl : p.pnl) && (p.status === 'OPEN' ? p.unrealizedPnl : p.pnl)! < 0 ? 'loss-text' : 'win-text'}>{money(p.status === 'OPEN' ? p.unrealizedPnl : p.pnl)}</strong></div></div>)}</div>}</article>; }
function money(value?: number) { if (typeof value !== 'number' || Number.isNaN(value)) return '$0.00'; const sign = value < 0 ? '-' : ''; return `${sign}$${Math.abs(value).toFixed(4)}`; }
function pct(value?: number) { return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : '0.00%'; }
function num(value?: number) { return typeof value === 'number' ? (value < 1 ? value.toFixed(6) : value.toFixed(3)) : '-'; }
function tone(value?: number): 'positive' | 'negative' | 'neutral' { if (!value) return 'neutral'; return value > 0 ? 'positive' : 'negative'; }
