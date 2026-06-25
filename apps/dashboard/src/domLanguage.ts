type Lang = 'ar' | 'en';

const translations: Record<string, string> = {
  'Smart Market Lab': 'مختبر السوق الذكي',
  'Simulation dashboard': 'لوحة المحاكاة والتحليل',
  'Market scanner, strategy checks, backtests, paper-mode performance boxes, and account analytics.': 'ماسح السوق، الإشارات، الاختبارات، بوكسات الربح والخسارة، وتحليلات الحساب التجريبي.',
  'Safe Mode': 'الوضع الآمن',
  'Symbol': 'العملة',
  'Interval': 'الفريم',
  'Find Best + Auto Test': 'اختيار الأفضل + اختبار',
  'Run Signal': 'تحليل الإشارة',
  'Run Backtest': 'تشغيل الاختبار',
  'Paper Tick': 'تجربة ورقية',
  'Close Winners': 'إغلاق الرابحين',
  'Close All': 'إغلاق الكل',
  'Reset Paper': 'تصفير التجربة',
  'Start Lab Loop': 'تشغيل المراقبة',
  'Stop Lab Loop': 'إيقاف المراقبة',
  'Run Loop Once': 'تشغيل دورة واحدة',
  'Refresh Loop': 'تحديث المراقبة',
  'Refresh P/L': 'تحديث الربح/الخسارة',
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
  'Reason': 'السبب',
  'Open For': 'مفتوحة منذ',
  'ETA Close': 'تقدير الإغلاق',
  'Nearest': 'أقرب خروج',
  'estimating': 'يتم التقدير',
  'TARGET': 'هدف',
  'STOP': 'وقف',
  'MANUAL_GREEN': 'إغلاق ربح يدوي',
  'MANUAL_ALL': 'إغلاق يدوي',
  'open': 'مفتوحة',
  'closed': 'مغلقة'
};

const reverseTranslations = Object.fromEntries(Object.entries(translations).map(([en, ar]) => [ar, en]));
let currentLang: Lang = (localStorage.getItem('dashboard-lang') as Lang) || 'ar';
let observer: MutationObserver | null = null;
let autoCloseTimer: number | null = null;
let autoStatusTimer: number | null = null;

function translateDynamic(value: string, lang: Lang) {
  let output = value;

  if (lang === 'ar') {
    output = output.replace(/\bopen\s+(\d+)\b/g, 'مفتوحة $1');
    output = output.replace(/\bclosed\s+(\d+)\b/g, 'مغلقة $1');
    output = output.replace(/\b(\d+)\s+open\b/g, '$1 مفتوحة');
    output = output.replace(/\b(\d+)\s+closed\b/g, '$1 مغلقة');
    output = output.replace(/Start:/g, 'البداية:');
    output = output.replace(/Balance:/g, 'الرصيد:');
    output = output.replace(/Best:/g, 'الأفضل:');
    output = output.replace(/Worst:/g, 'الأسوأ:');
    output = output.replace(/TARGET/g, 'هدف');
    output = output.replace(/STOP/g, 'وقف');
    output = output.replace(/MANUAL_GREEN/g, 'إغلاق ربح يدوي');
    output = output.replace(/MANUAL_ALL/g, 'إغلاق يدوي');
    output = output.replace(/(\d+)h\s+(\d+)m\s+(\d+)s/g, '$1س $2د $3ث');
    output = output.replace(/(\d+)m\s+(\d+)s/g, '$1د $2ث');
    return output;
  }

  output = output.replace(/مفتوحة\s+(\d+)/g, 'open $1');
  output = output.replace(/مغلقة\s+(\d+)/g, 'closed $1');
  output = output.replace(/(\d+)\s+مفتوحة/g, '$1 open');
  output = output.replace(/(\d+)\s+مغلقة/g, '$1 closed');
  output = output.replace(/البداية:/g, 'Start:');
  output = output.replace(/الرصيد:/g, 'Balance:');
  output = output.replace(/الأفضل:/g, 'Best:');
  output = output.replace(/الأسوأ:/g, 'Worst:');
  output = output.replace(/هدف/g, 'TARGET');
  output = output.replace(/وقف/g, 'STOP');
  output = output.replace(/إغلاق ربح يدوي/g, 'MANUAL_GREEN');
  output = output.replace(/إغلاق يدوي/g, 'MANUAL_ALL');
  output = output.replace(/(\d+)س\s+(\d+)د\s+(\d+)ث/g, '$1h $2m $3s');
  output = output.replace(/(\d+)د\s+(\d+)ث/g, '$1m $2s');
  return output;
}

function translateText(value: string, lang: Lang) {
  const trimmed = value.trim();
  if (!trimmed) return value;

  const exact = lang === 'ar' ? translations[trimmed] : reverseTranslations[trimmed];
  if (exact) return value.replace(trimmed, exact);

  return translateDynamic(value, lang);
}

function applyLanguage(lang: Lang) {
  currentLang = lang;
  localStorage.setItem('dashboard-lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (['SCRIPT', 'STYLE', 'PRE', 'CODE', 'TEXTAREA'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) node.nodeValue = translateText(node.nodeValue ?? '', lang);

  document.querySelectorAll<HTMLElement>('[data-lang-switch] button').forEach((button) => {
    button.classList.toggle('active', button.dataset.lang === lang);
  });
}

function addSwitcher() {
  if (document.querySelector('[data-lang-switch]')) return;

  const switcher = document.createElement('div');
  switcher.className = 'language-switcher';
  switcher.dataset.langSwitch = 'true';
  switcher.innerHTML = '<button data-lang="ar">AR</button><button data-lang="en">EN</button>';
  switcher.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const lang = target.dataset.lang as Lang | undefined;
    if (lang) applyLanguage(lang);
  });

  document.body.appendChild(switcher);
}

function addAutoOnlyStyle() {
  if (document.getElementById('auto-only-style')) return;
  const style = document.createElement('style');
  style.id = 'auto-only-style';
  style.textContent = `
    .controls.card { display: none !important; }
    .auto-control-panel { display: grid; grid-template-columns: 1fr auto auto; gap: 14px; align-items: center; margin-bottom: 20px; padding: 18px; border-radius: 24px; border: 1px solid rgba(159,179,202,.18); background: rgba(11,25,44,.82); }
    .auto-control-panel.is-on { border-color: rgba(110,231,183,.55); box-shadow: 0 0 0 1px rgba(110,231,183,.12),0 22px 60px rgba(16,185,129,.08); }
    .auto-control-panel strong { font-size: 18px; }
    .auto-control-panel span { color: #9fb3ca; font-weight: 800; }
    .auto-main-button { min-height: 54px; min-width: 190px; border-radius: 16px; font-weight: 1000; }
    .auto-main-button.is-on { background: rgba(239,68,68,.24); color: #fecaca; border: 1px solid rgba(248,113,113,.35); }
    .auto-main-button.is-off { background: #10b981; color: #041c14; box-shadow: 0 0 28px rgba(16,185,129,.25); }
    @media (max-width: 980px) { .auto-control-panel { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);
}

function addAutoPanel() {
  if (document.getElementById('auto-control-panel')) return;
  const summary = document.querySelector('.summary-grid');
  if (!summary || !summary.parentElement) return;

  const panel = document.createElement('section');
  panel.id = 'auto-control-panel';
  panel.className = 'auto-control-panel';
  panel.innerHTML = `
    <div><strong data-auto-title>النظام الآلي متوقف</strong><br><span data-auto-subtitle>زر واحد فقط للتشغيل والإيقاف</span></div>
    <label style="display:grid;gap:6px;color:#9fb3ca;font-weight:800">الفريم<select data-auto-interval><option>1m</option><option>3m</option><option>5m</option><option>15m</option></select></label>
    <button class="auto-main-button is-off" data-auto-button>تشغيل النظام الآلي</button>
  `;
  summary.insertAdjacentElement('afterend', panel);

  const button = panel.querySelector<HTMLButtonElement>('[data-auto-button]');
  button?.addEventListener('click', () => void toggleAutoPanel());
}

async function toggleAutoPanel() {
  const status = await fetchAutoStatus();
  const active = status?.data?.enabled === true;
  const interval = (document.querySelector<HTMLSelectElement>('[data-auto-interval]')?.value ?? '1m') as string;

  if (active) {
    await fetch('/api/lab-loop/stop', { method: 'POST' });
  } else {
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
        size: 0
      })
    });
  }

  await refreshAutoPanel();
}

async function fetchAutoStatus() {
  try {
    const response = await fetch('/api/lab-loop/status');
    return await response.json();
  } catch {
    return null;
  }
}

async function refreshAutoPanel() {
  const status = await fetchAutoStatus();
  const active = status?.data?.enabled === true;
  const runs = status?.data?.runs ?? 0;
  const panel = document.getElementById('auto-control-panel');
  const title = document.querySelector<HTMLElement>('[data-auto-title]');
  const subtitle = document.querySelector<HTMLElement>('[data-auto-subtitle]');
  const button = document.querySelector<HTMLButtonElement>('[data-auto-button]');
  const interval = document.querySelector<HTMLSelectElement>('[data-auto-interval]');

  panel?.classList.toggle('is-on', active);
  if (title) title.textContent = active ? 'النظام الآلي شغال' : 'النظام الآلي متوقف';
  if (subtitle) subtitle.textContent = active ? `الدورات: ${runs} — يتم فحص السوق تلقائيًا` : 'زر واحد فقط للتشغيل والإيقاف';
  if (button) {
    button.textContent = active ? 'إيقاف النظام' : 'تشغيل النظام الآلي';
    button.classList.toggle('is-on', active);
    button.classList.toggle('is-off', !active);
  }
  if (interval) interval.disabled = active;
}

function startAutoControlLayer() {
  addAutoOnlyStyle();
  addAutoPanel();
  void refreshAutoPanel();

  if (autoStatusTimer) window.clearInterval(autoStatusTimer);
  autoStatusTimer = window.setInterval(() => void refreshAutoPanel(), 2000);

  if (autoCloseTimer) window.clearInterval(autoCloseTimer);
  autoCloseTimer = window.setInterval(async () => {
    const status = await fetchAutoStatus();
    if (status?.data?.enabled === true) {
      await fetch('/api/lab/paper/close-winners', { method: 'POST' }).catch(() => undefined);
    }
  }, 2500);
}

function startLanguageLayer() {
  addSwitcher();
  startAutoControlLayer();
  applyLanguage(currentLang);

  observer = new MutationObserver(() => {
    observer?.disconnect();
    addSwitcher();
    startAutoControlLayer();
    applyLanguage(currentLang);
    observer?.observe(document.body, { childList: true, subtree: true, characterData: true });
  });

  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

window.addEventListener('load', startLanguageLayer);
