let guardTimer: number | null = null;

const budgetKey = 'paper-auto-budget-limit';

function getBudgetLimit() {
  const value = Number(localStorage.getItem(budgetKey) ?? '50');
  return Number.isFinite(value) && value > 0 ? value : 50;
}

function setBudgetLimit(value: number) {
  if (!Number.isFinite(value) || value <= 0) return;
  localStorage.setItem(budgetKey, String(value));
}

function addBudgetInput() {
  const panel = document.getElementById('auto-control-panel');
  if (!panel || panel.querySelector('[data-budget-limit]')) return;

  const label = document.createElement('label');
  label.style.display = 'grid';
  label.style.gap = '6px';
  label.style.color = '#9fb3ca';
  label.style.fontWeight = '800';
  label.innerHTML = `حد الإيقاف $
    <input data-budget-limit type="number" min="1" step="1" value="${getBudgetLimit()}" style="min-height:44px;border:1px solid rgba(159,179,202,.22);border-radius:14px;background:rgba(7,17,31,.9);color:#e5eefb;padding:0 14px;outline:none;max-width:130px" />`;

  const button = panel.querySelector('[data-auto-button]');
  panel.insertBefore(label, button ?? null);

  label.querySelector<HTMLInputElement>('[data-budget-limit]')?.addEventListener('change', (event) => {
    setBudgetLimit(Number((event.target as HTMLInputElement).value));
  });
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  return response.json();
}

async function runBudgetGuard() {
  try {
    addBudgetInput();

    const status = await fetchJson('/api/lab-loop/status');
    if (status?.data?.enabled !== true) return;

    const summary = await fetchJson('/api/lab/paper/summary');
    const data = summary?.data;
    const starting = Number(data?.startingBalance ?? 0);
    const equity = Number(data?.equity ?? starting);
    const budget = getBudgetLimit();

    if (starting > 0 && equity <= starting - budget) {
      await fetch('/api/lab/paper/close-all', { method: 'POST' }).catch(() => undefined);
      await fetch('/api/lab-loop/stop', { method: 'POST' }).catch(() => undefined);
      const title = document.querySelector<HTMLElement>('[data-auto-title]');
      const subtitle = document.querySelector<HTMLElement>('[data-auto-subtitle]');
      if (title) title.textContent = 'النظام توقف لحماية الرصيد';
      if (subtitle) subtitle.textContent = `وصل حد الإيقاف: ${budget}$`;
    }
  } catch {
    // keep UI guard alive
  }
}

function startBudgetGuard() {
  addBudgetInput();
  if (guardTimer) window.clearInterval(guardTimer);
  guardTimer = window.setInterval(() => void runBudgetGuard(), 2000);
}

window.addEventListener('load', () => {
  window.setTimeout(startBudgetGuard, 800);
});
