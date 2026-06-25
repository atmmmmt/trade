import { useEffect, useState } from 'react';

type ApiState<T> = { loading: boolean; data: T | null; error: string | null };
type LoopStatus = { ok: boolean; data: { enabled?: boolean; running?: boolean; runs?: number; nextRunAt?: string | null; lastResult?: unknown } };
type PaperPosition = { id: string; symbol: string; side: string; entryPrice: number; currentPrice?: number; status: string; pnl?: number; unrealizedPnl?: number; openedAt?: string; timeOpenSeconds?: number };
type PaperSummary = { equity: number; balance: number; realizedPnl: number; unrealizedPnl: number; totalPnl: number; totalPnlPercent: number; wins: number; losses: number; winRate: number; openCount: number; closedCount: number; openPositions: PaperPosition[]; closedPositions: PaperPosition[]; equityCurve: Array<{ equity: number }>; updatedAt: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  const json = await response.json();
  if (!response.ok || json.ok === false) throw new Error(json.error ?? 'Request failed');
  return json as T;
}

export function AutoApp() {
  const [interval, setIntervalValue] = useState('1m');
  const [loop, setLoop] = useState<ApiState<LoopStatus>>({ loading: false, data: null, error: null });
  const [summary, setSummary] = useState<ApiState<PaperSummary>>({ loading: false, data: null, error: null });
  const active = loop.data?.data.enabled === true;

  useEffect(() => {
    void refreshAll();
    const id = window.setInterval(() => void refreshAll(), 2000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(async () => {
      try {
        await api('/api/lab/paper/close-winners', { method: 'POST' });
        await refreshSummary();
      } catch {
        // paper simulation continues
      }
    }, 2500);
    return () => window.clearInterval(id);
  }, [active]);

  async function refreshAll() {
    await Promise.all([refreshLoop(), refreshSummary()]);
  }

  async function refreshLoop() {
    try {
      setLoop({ loading: false, data: await api<LoopStatus>('/api/lab-loop/status'), error: null });
    } catch (error) {
      setLoop((old) => ({ ...old, error: error instanceof Error ? error.message : 'Error' }));
    }
  }

  async function refreshSummary() {
    try {
      const response = await api<{ ok: boolean; data: PaperSummary }>('/api/lab/paper/summary');
      setSummary({ loading: false, data: response.data, error: null });
    } catch (error) {
      setSummary((old) => ({ ...old, error: error instanceof Error ? error.message : 'Error' }));
    }
  }

  async function toggleAuto() {
    setLoop((old) => ({ ...old, loading: true, error: null }));
    try {
      if (active) {
        setLoop({ loading: false, data: await api<LoopStatus>('/api/lab-loop/stop', { method: 'POST' }), error: null });
      } else {
        setLoop({
          loading: false,
          data: await api<LoopStatus>('/api/lab-loop/start', {
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
              size: 0
            })
          }),
          error: null
        });
      }
      await refreshAll();
    } catch (error) {
      setLoop((old) => ({ ...old, loading: false, error: error instanceof Error ? error.message : 'Error' }));
    }
  }

  const data = summary.data;

  return <main className="page">
    <section className="hero">
      <div>
        <p className="eyebrow">مختبر السوق الذكي</p>
        <h1>لوحة التشغيل الآلي</h1>
        <p className="lead">محاكاة تجريبية فقط. زر واحد للتشغيل والإيقاف، مع إغلاق النتائج الخضراء تلقائيًا.</p>
      </div>
      <div className="status">Paper Mode</div>
    </section>

    <section className="summary-grid">
      <Stat label="قيمة الحساب" value={money(data?.equity)} hint="الرصيد الحالي" tone="neutral" />
      <Stat label="الصافي" value={money(data?.totalPnl)} hint={percent(data?.totalPnlPercent)} tone={tone(data?.totalPnl)} />
      <Stat label="المفتوح" value={money(data?.unrealizedPnl)} hint="عينات جارية" tone={tone(data?.unrealizedPnl)} />
      <Stat label="المسجل" value={money(data?.realizedPnl)} hint="عينات منتهية" tone={tone(data?.realizedPnl)} />
      <Stat label="نسبة الفوز" value={percent(data?.winRate)} hint={`${data?.wins ?? 0} / ${data?.losses ?? 0}`} tone="neutral" />
      <Stat label="الصفقات" value={`${data?.openCount ?? 0} مفتوحة`} hint={`${data?.closedCount ?? 0} مغلقة`} tone="neutral" />
    </section>

    <section className={`loop-state-card ${active ? 'is-active' : 'is-inactive'}`}>
      <div><span className="state-dot" /><strong>{active ? 'النظام شغال' : 'النظام متوقف'}</strong><small>{loop.data?.data.running ? 'ينفذ الآن' : 'جاهز'}</small></div>
      <div><span>الدورات</span><strong>{loop.data?.data.runs ?? 0}</strong></div>
      <div><span>الفريم</span><select value={interval} disabled={active} onChange={(event) => setIntervalValue(event.target.value)}><option>1m</option><option>3m</option><option>5m</option><option>15m</option></select></div>
    </section>

    <section className="card controls auto-main">
      <button className={active ? 'danger big-auto' : 'active-on big-auto'} onClick={toggleAuto} disabled={loop.loading}>{active ? 'إيقاف النظام' : 'تشغيل النظام الآلي'}</button>
      <p className="muted">لا يوجد تشغيل يدوي. عند الضغط على التشغيل، النظام يدير المحاكاة بالكامل.</p>
    </section>

    <section className="dashboard-grid">
      <Chart points={data?.equityCurve ?? []} />
      <Positions title="المفتوحة" positions={data?.openPositions ?? []} empty="لا توجد صفقات مفتوحة الآن." />
      <Positions title="المغلقة" positions={data?.closedPositions ?? []} empty="لا توجد صفقات مغلقة بعد." />
    </section>

    <section className="card result"><h2>آخر ملاحظة</h2><pre>{JSON.stringify({ active, error: loop.error || summary.error, last: loop.data?.data.lastResult ?? null }, null, 2)}</pre></section>
  </main>;
}

function Stat(props: { label: string; value: string; hint: string; tone: 'positive' | 'negative' | 'neutral' }) { return <article className={`stat-card ${props.tone}`}><p>{props.label}</p><strong>{props.value}</strong><span>{props.hint}</span></article>; }
function Chart(props: { points: Array<{ equity: number }> }) { const points = props.points.length > 1 ? props.points : [{ equity: 1000 }, { equity: 1000 }]; const values = points.map((point) => point.equity); const min = Math.min(...values); const max = Math.max(...values); const range = Math.max(max - min, 1); const path = points.map((point, index) => { const x = (index / Math.max(points.length - 1, 1)) * 620; const y = 180 - ((point.equity - min) / range) * 180; return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`; }).join(' '); return <article className="card panel-card wide-card"><div className="panel-head"><h2>شارت الأداء</h2></div><svg className="equity-chart" viewBox="0 0 620 180" preserveAspectRatio="none"><path d={path} /></svg></article>; }
function Positions(props: { title: string; positions: PaperPosition[]; empty: string }) { return <article className="card panel-card"><div className="panel-head"><h2>{props.title}</h2><span>{props.positions.length}</span></div>{props.positions.length === 0 ? <p className="muted">{props.empty}</p> : <div className="positions-list">{props.positions.map((p) => <div className="position-row" key={p.id}><div><strong>{p.symbol}</strong><span>{p.side}</span></div><div><span>دخول</span><strong>{num(p.entryPrice)}</strong></div><div><span>حالي</span><strong>{num(p.currentPrice ?? p.entryPrice)}</strong></div><div><span>صافي</span><strong className={(p.status === 'OPEN' ? p.unrealizedPnl : p.pnl) && (p.status === 'OPEN' ? p.unrealizedPnl : p.pnl)! < 0 ? 'loss-text' : 'win-text'}>{money(p.status === 'OPEN' ? p.unrealizedPnl : p.pnl)}</strong></div></div>)}</div>}</article>; }
function money(value?: number) { if (typeof value !== 'number' || Number.isNaN(value)) return '$0.0000'; const sign = value < 0 ? '-' : ''; return `${sign}$${Math.abs(value).toFixed(4)}`; }
function percent(value?: number) { return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : '0.00%'; }
function num(value?: number) { return typeof value === 'number' ? (value < 1 ? value.toFixed(6) : value.toFixed(3)) : '-'; }
function tone(value?: number): 'positive' | 'negative' | 'neutral' { if (!value) return 'neutral'; return value > 0 ? 'positive' : 'negative'; }
