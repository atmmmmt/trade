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
  'open': 'مفتوحة',
  'closed': 'مغلقة'
};

const reverseTranslations = Object.fromEntries(Object.entries(translations).map(([en, ar]) => [ar, en]));
let currentLang: Lang = (localStorage.getItem('dashboard-lang') as Lang) || 'ar';
let observer: MutationObserver | null = null;

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

function startLanguageLayer() {
  addSwitcher();
  applyLanguage(currentLang);

  observer = new MutationObserver(() => {
    observer?.disconnect();
    addSwitcher();
    applyLanguage(currentLang);
    observer?.observe(document.body, { childList: true, subtree: true, characterData: true });
  });

  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

window.addEventListener('load', startLanguageLayer);
