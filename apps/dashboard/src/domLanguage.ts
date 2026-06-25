let statusTimer: number | null = null;
let closeTimer: number | null = null;
let budgetTimer: number | null = null;
let translateTimer: number | null = null;

const keys = {
  capital: 'auto-capital-usd',
  budget: 'auto-budget-usd',
  position: 'auto-position-usd',
  interval: 'auto-interval'
};

const ar: Record<string, string> = {
  'Smart Market Lab': 'مختبر السوق الذكي',
  'Simulation dashboard': 'لوحة المحاكاة والتحليل',
  'Market scanner, strategy checks, backtests, paper-mode performance boxes, and account analytics.': 'ماسح السوق، الإشارات، الاختبارات، بوكسات الربح والخسارة، وتحليلات الحساب التجريبي.',
  'Safe Mode': 'الوضع الآمن',
  'Equity': 'قيمة الحساب',
  'Balance + open P/L': 'الرصيد + الربح المفتوح',
  'Total P/L': 'إجمالي الربح/الخسارة',
  'Realized P/L': 'الربح المحقق',
  'Closed results': 'نتائج الصفقات المغلقة',
  'Open P/L': 'الربح المفتوح',
  'Running positions': 'الصفقات الحالية',
  'Win Rate': 'نسبة الفوز',
  'Positions': 'الصفقات',
  'Performance Chart': 'شارت الأداء',
  'Waiting': 'بانتظار البيانات',
  'Open Positions': 'الصفقات المفتوحة',
  'Closed Positions': 'الصفقات المغلقة',
  'No open paper positions.': 'لا توجد صفقات مفتوحة الآن.',
  'No closed paper positions yet.': 'لا توجد صفقات مغلقة بعد.',
  'Lab Loop Raw': 'بيانات المراقبة الخام',
  'Best Market Raw': 'بيانات أفضل عملة الخام',
  'Signal Raw': 'بيانات الإشارة الخام',
  'Backtest Raw': 'بيانات الاختبار الخام',
  'Paper Raw': 'بيانات التجربة الخام',
  'No data yet.': 'لا توجد بيانات بعد.',
  'Loading...': 'جاري التحميل...',
  'Start': 'البداية',
  'Balance': 'الرصيد',
  'Best': 'الأفضل',
  'Worst': 'الأسوأ',
  'Entry': 'الدخول',
  'Now/Exit': 'الحالي/الخروج',
  'P/L': 'ربح/خسارة',
  'Open For': 'مفتوحة منذ',
  'ETA Close': 'تقدير الإغلاق',
  'Nearest': 'أقرب خروج',
  'TARGET': 'هدف',
  'STOP': 'وقف',
  'open': 'مفتوحة',
  'closed': 'مغلقة'
};

function savedNumber(key: string, fallback: number) {
  const value = Number(localStorage.getItem(key) ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function saveNumber(key: string, value: number) {
  if (Number.isFinite(value) && value > 0) localStorage.setItem(key, String(value));
}

async function json(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  return response.json();
}

function translateText(value: string) {
  let output = value;
  const trimmed = output.trim();
  if (ar[trimmed]) output = output.replace(trimmed, ar[trimmed]);
  output = output.replace(/\bopen\s+(\d+)\b/g, 'مفتوحة $1');
  output = output.replace(/\bclosed\s+(\d+)\b/g, 'مغلقة $1');
  output = output.replace(/Start:/g, 'البداية:');
  output = output.replace(/Balance:/g, 'الرصيد:');
  output = output.replace(/Best:/g, 'الأفضل:');
  output = output.replace(/Worst:/g, 'الأسوأ:');
  output = output.replace(/TARGET/g, 'هدف');
  output = output.replace(/STOP/g, 'وقف');
  output = output.replace(/(\d+)h\s+(\d+)m\s+(\d+)s/g, '$1س $2د $3ث');
  output = output.replace(/(\d+)m\s+(\d+)s/g, '$1د $2ث');
  return output;
}

function applyArabic() {
  document.documentElement.lang = 'ar';
  document.documentElement.dir = 'rtl';

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (['SCRIPT', 'STYLE', 'PRE', 'CODE', 'TEXTAREA', 'INPUT', 'SELECT'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) node.nodeValue = translateText(node.nodeValue ?? '');
}

function addStyle() {
  if (document.getElementById('auto-only-style')) return;
  const style = document.createElement('style');
  style.id = 'auto-only-style';
  style.textContent = `
    .controls.card { display: none !important; }
    .language-switcher { display: none !important; }
    .auto-control-panel { display: grid; grid-template-columns: 1fr repeat(4, auto) auto auto; gap: 14px; align-items: end; margin-bottom: 20px; padding: 18px; border-radius: 24px; border: 1px solid rgba(159,179,202,.18); background: rgba(11,25,44,.82); direction: rtl; }
    .auto-control-panel.is-on { border-color: rgba(110,231,183,.55); box-shadow: 0 0 0 1px rgba(110,231,183,.12),0 22px 60px rgba(16,185,129,.08); }
    .auto-control-panel strong { font-size: 18px; }
    .auto-control-panel span { color: #9fb3ca; font-weight: 800; }
    .auto-control-panel label { display: grid; gap: 6px; color: #9fb3ca; font-weight: 800; font-size: 12px; }
    .auto-control-panel input, .auto-control-panel select { min-height: 44px; border: 1px solid rgba(159,179,202,.22); border-radius: 14px; background: rgba(7,17,31,.9); color: #e5eefb; padding: 0 14px; outline: none; width: 105px; }
    .auto-main-button, .auto-reset-button { min-height: 54px; min-width: 150px; border-radius: 16px; font-weight: 1000; border: 0; cursor: pointer; }
    .auto-main-button.is-on { background: rgba(239,68,68,.24); color: #fecaca; border: 1px solid rgba(248,113,113,.35); }
    .auto-main-button.is-off { background: #10b981; color: #041c14; box-shadow: 0 0 28px rgba(16,185,129,.25); }
    .auto-reset-button { background: rgba(148,163,184,.16); color: #e5eefb; border: 1px solid rgba(148,163,184,.25); }
    @media (max-width: 1200px) { .auto-control-panel { grid-template-columns: 1fr 1fr; } }
  `;
  document.head.appendChild(style);
}

function addPanel() {
  if (document.getElementById('auto-control-panel')) return;
  const summary = document.querySelector('.summary-grid');
  if (!summary) return;

  const panel = document.createElement('section');
  panel.id = 'auto-control-panel';
  panel.className = 'auto-control-panel';
  panel.innerHTML = `
    <div><strong data-auto-title>النظام الآلي متوقف</strong><br><span data-auto-subtitle>حدد المبلغ واضغط تشغيل فقط</span></div>
    <label>رأس مال البوت $<input data-auto-capital type="number" min="5" step="1" value="${savedNumber(keys.capital, 20)}" /></label>
    <label>حد الإيقاف $<input data-auto-budget type="number" min="1" step="1" value="${savedNumber(keys.budget, 5)}" /></label>
    <label>أقصى صفقة $<input data-auto-position type="number" min="1" step="1" value="${savedNumber(keys.position, 5)}" /></label>
    <label>الفريم<select data-auto-interval><option>1m</option><option>3m</option><option>5m</option><option>15m</option></select></label>
    <button class="auto-main-button is-off" data-auto-button>تشغيل النظام الآلي</button>
    <button class="auto-reset-button" data-auto-reset>تصفير كل شيء</button>
  `;
  summary.insertAdjacentElement('afterend', panel);

  const interval = panel.querySelector<HTMLSelectElement>('[data-auto-interval]');
  if (interval) interval.value = localStorage.getItem(keys.interval) ?? '1m';

  panel.querySelector<HTMLButtonElement>('[data-auto-button]')?.addEventListener('click', () => void toggleAuto());
  panel.querySelector<HTMLButtonElement>('[data-auto-reset]')?.addEventListener('click', () => void resetAll());
}

function panelNumber(selector: string, fallback: number) {
  const input = document.querySelector<HTMLInputElement>(selector);
  const value = Number(input?.value ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function fetchStatus() {
  try { return await json('/api/lab-loop/status'); } catch { return null; }
}

async function resetAll() {
  const capital = panelNumber('[data-auto-capital]', 20);
  saveNumber(keys.capital, capital);
  saveNumber(keys.budget, panelNumber('[data-auto-budget]', 5));
  saveNumber(keys.position, panelNumber('[data-auto-position]', 5));

  await fetch('/api/lab-loop/stop', { method: 'POST' }).catch(() => undefined);
  await fetch('/api/lab/paper/close-all', { method: 'POST' }).catch(() => undefined);
  await fetch('/api/lab/paper/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ balance: capital })
  });

  const title = document.querySelector<HTMLElement>('[data-auto-title]');
  const subtitle = document.querySelector<HTMLElement>('[data-auto-subtitle]');
  if (title) title.textContent = 'تم تصفير التجربة';
  if (subtitle) subtitle.textContent = `الرصيد عاد إلى ${capital}$ — اضغط تشغيل للبدء`;
  await refreshPanel();
}

async function toggleAuto() {
  const status = await fetchStatus();
  const active = status?.data?.enabled === true;

  if (active) {
    await fetch('/api/lab-loop/stop', { method: 'POST' });
    await refreshPanel();
    return;
  }

  const capital = panelNumber('[data-auto-capital]', 20);
  const budget = panelNumber('[data-auto-budget]', 5);
  const position = panelNumber('[data-auto-position]', 5);
  const interval = document.querySelector<HTMLSelectElement>('[data-auto-interval]')?.value ?? '1m';

  saveNumber(keys.capital, capital);
  saveNumber(keys.budget, budget);
  saveNumber(keys.position, position);
  localStorage.setItem(keys.interval, interval);

  await fetch('/api/lab/paper/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ balance: capital }) });
  await fetch('/api/lab-loop/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  await refreshPanel();
}

async function refreshPanel() {
  const status = await fetchStatus();
  const active = status?.data?.enabled === true;
  const runs = status?.data?.runs ?? 0;
  const panel = document.getElementById('auto-control-panel');
  const title = document.querySelector<HTMLElement>('[data-auto-title]');
  const subtitle = document.querySelector<HTMLElement>('[data-auto-subtitle]');
  const button = document.querySelector<HTMLButtonElement>('[data-auto-button]');
  const resetButton = document.querySelector<HTMLButtonElement>('[data-auto-reset]');
  const inputs = document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-auto-capital],[data-auto-budget],[data-auto-position],[data-auto-interval]');

  panel?.classList.toggle('is-on', active);
  if (title) title.textContent = active ? 'النظام الآلي شغال' : 'النظام الآلي متوقف';
  if (subtitle) subtitle.textContent = active ? `الدورات: ${runs} — الحماية تعمل تلقائيًا` : 'حدد المبلغ واضغط تشغيل فقط';
  if (button) {
    button.textContent = active ? 'إيقاف النظام' : 'تشغيل النظام الآلي';
    button.classList.toggle('is-on', active);
    button.classList.toggle('is-off', !active);
  }
  if (resetButton) resetButton.disabled = active;
  inputs.forEach((input) => { input.disabled = active; });
  applyArabic();
}

async function budgetGuard() {
  try {
    const status = await fetchStatus();
    if (status?.data?.enabled !== true) return;
    const summary = await json('/api/lab/paper/summary');
    const data = summary?.data;
    const start = Number(data?.startingBalance ?? 0);
    const equity = Number(data?.equity ?? start);
    const budget = savedNumber(keys.budget, 5);

    if (start > 0 && equity <= start - budget) {
      await fetch('/api/lab/paper/close-all', { method: 'POST' }).catch(() => undefined);
      await fetch('/api/lab-loop/stop', { method: 'POST' }).catch(() => undefined);
      const title = document.querySelector<HTMLElement>('[data-auto-title]');
      const subtitle = document.querySelector<HTMLElement>('[data-auto-subtitle]');
      if (title) title.textContent = 'النظام توقف لحماية الرصيد';
      if (subtitle) subtitle.textContent = `وصل حد الإيقاف: ${budget}$`;
    }
  } catch {
    // keep running
  }
}

function start() {
  addStyle();
  addPanel();
  applyArabic();
  void refreshPanel();

  if (statusTimer) window.clearInterval(statusTimer);
  statusTimer = window.setInterval(() => void refreshPanel(), 5000);

  if (closeTimer) window.clearInterval(closeTimer);
  closeTimer = window.setInterval(async () => {
    const status = await fetchStatus();
    if (status?.data?.enabled === true) await fetch('/api/lab/paper/close-winners', { method: 'POST' }).catch(() => undefined);
  }, 5000);

  if (budgetTimer) window.clearInterval(budgetTimer);
  budgetTimer = window.setInterval(() => void budgetGuard(), 12000);

  if (translateTimer) window.clearInterval(translateTimer);
  translateTimer = window.setInterval(() => applyArabic(), 3000);
}

window.addEventListener('load', start);
