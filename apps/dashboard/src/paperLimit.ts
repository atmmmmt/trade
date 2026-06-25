const key = 'paper-budget-limit-usd';
let timer: number | null = null;

function readLimit() {
  const value = Number(localStorage.getItem(key) ?? '50');
  return Number.isFinite(value) && value > 0 ? value : 50;
}

function writeLimit(value: number) {
  if (Number.isFinite(value) && value > 0) localStorage.setItem(key, String(value));
}

function attachInput() {
  const panel = document.getElementById('auto-control-panel');
  if (!panel || panel.querySelector('[data-paper-budget]')) return;

  const label = document.createElement('label');
  label.style.display = 'grid';
  label.style.gap = '6px';
  label.style.color = '#9fb3ca';
  label.style.fontWeight = '800';
  label.innerHTML = `حد الإيقاف $
    <input data-paper-budget type="number" min="1" step="1" value="${readLimit()}" style="min-height:44px;border:1px solid rgba(159,179,202,.22);border-radius:14px;background:rgba(7,17,31,.9);color:#e5eefb;padding:0 14px;outline:none;max-width:130px" />`;

  const button = panel.querySelector('[data-auto-button]');
  panel.insertBefore(label, button ?? null);
  label.querySelector<HTMLInputElement>('[data-paper-budget]')?.addEventListener('change', (event) => writeLimit(Number((event.target as HTMLInputElement).value)));
}

async function json(url: string, init?: RequestInit) {
  return (await fetch(url, init)).json();
}

async function checkLimit() {
  try {
    attachInput();
    const status = await json('/api/lab-loop/status');
    if (status?.data?.enabled !== true) return;
    const summary = await json('/api/lab/paper/summary');
    const data = summary?.data;
    const start = Number(data?.startingBalance ?? 0);
    const equity = Number(data?.equity ?? start);
    const limit = readLimit();
    if (start > 0 && equity <= start - limit) {
      await fetch('/api/lab/paper/close-all', { method: 'POST' }).catch(() => undefined);
      await fetch('/api/lab-loop/stop', { method: 'POST' }).catch(() => undefined);
      const title = document.querySelector<HTMLElement>('[data-auto-title]');
      const subtitle = document.querySelector<HTMLElement>('[data-auto-subtitle]');
      if (title) title.textContent = 'النظام توقف لحماية الرصيد';
      if (subtitle) subtitle.textContent = `تم الوصول إلى حد الإيقاف: ${limit}$`;
    }
  } catch {
    // keep alive
  }
}

function start() {
  attachInput();
  if (timer) window.clearInterval(timer);
  timer = window.setInterval(() => void checkLimit(), 2000);
}

window.addEventListener('load', () => window.setTimeout(start, 1000));
