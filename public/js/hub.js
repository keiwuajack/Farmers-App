(function () {
  'use strict';

  // ---------- Theme (dark mode) ----------
  const root = document.documentElement;
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', savedTheme || (prefersDark ? 'dark' : 'light'));

  window.toggleTheme = function () {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
  };

  // ---------- Data (indicative values; always confirm at your local market) ----------
  const MARKET_PRICES = [
    { item: 'Maize (90kg bag)', icon: '🌽', kes: 3600, trend: 'up' },
    { item: 'Beans (90kg bag)', icon: '🫘', kes: 11000, trend: 'flat' },
    { item: 'Tomatoes (crate)', icon: '🍅', kes: 4500, trend: 'down' },
    { item: 'Irish potatoes (110kg bag)', icon: '🥔', kes: 3000, trend: 'up' },
    { item: 'Cabbage (large head)', icon: '🥬', kes: 60, trend: 'flat' },
    { item: 'Milk (per litre)', icon: '🥛', kes: 55, trend: 'up' },
    { item: 'Eggs (tray of 30)', icon: '🥚', kes: 450, trend: 'flat' },
    { item: 'Broiler chicken (live)', icon: '🐔', kes: 900, trend: 'up' },
    { item: 'Goat (mature)', icon: '🐐', kes: 9000, trend: 'up' },
    { item: 'Tea (green leaf, per kg)', icon: '🍃', kes: 30, trend: 'flat' }
  ];

  const CURRENCIES = {
    KES: { name: 'Kenyan Shilling', rate: 1 },
    USD: { name: 'US Dollar', rate: 0.0077 },
    EUR: { name: 'Euro', rate: 0.0071 },
    GBP: { name: 'British Pound', rate: 0.0061 },
    UGX: { name: 'Ugandan Shilling', rate: 28.5 },
    TZS: { name: 'Tanzanian Shilling', rate: 19.8 },
    RWF: { name: 'Rwandan Franc', rate: 10.7 },
    AED: { name: 'UAE Dirham', rate: 0.0283 }
  };

  const CROP_CALENDAR = [
    { crop: '🌽 Maize', plant: 'Mar–Apr (long rains) · Oct–Nov (short rains)', harvest: 'Aug–Sep · Feb–Mar', note: 'Use certified seed; top-dress with CAN at 4–6 weeks.' },
    { crop: '🫘 Beans', plant: 'Mar–Apr · Oct–Nov', harvest: '2.5–3 months later', note: 'Rotate with maize to fix nitrogen and cut disease.' },
    { crop: '🥔 Potatoes', plant: 'Mar–Apr · Sep–Oct', harvest: '3–4 months later', note: 'Use clean seed tubers; watch for late blight in wet weather.' },
    { crop: '🍅 Tomatoes', plant: 'Year-round with irrigation', harvest: '3 months after transplant', note: 'Stake plants and spray early against blight.' },
    { crop: '☕ Coffee', plant: 'Start of long rains', harvest: 'Oct–Dec main crop', note: 'Prune after harvest; mulch to hold moisture.' },
    { crop: '🌾 Wheat', plant: 'Apr–May / Jul–Aug (highlands)', harvest: '4–5 months later', note: 'Scout for rust; harvest at 13–14% moisture.' }
  ];

  const TIPS = [
    { icon: '🌱', title: 'Test your soil', text: 'A soil test tells you exactly which fertiliser and lime to buy, saving money and lifting yields.' },
    { icon: '💧', title: 'Save water', text: 'Drip kits and mulching can cut water use by up to half in dry spells.' },
    { icon: '🐄', title: 'Vaccinate on schedule', text: 'Keep a vaccination and deworming calendar for every animal, and call a vet early.' },
    { icon: '📦', title: 'Cut post-harvest loss', text: 'Dry grain below 13.5% moisture and use hermetic bags to avoid aflatoxin and weevils.' },
    { icon: '🤝', title: 'Sell together', text: 'Join a cooperative to get better prices, shared transport and access to loans.' },
    { icon: '📱', title: 'Track your records', text: 'Write down costs and sales per season. You can only grow what you measure.' }
  ];

  const EXPORT_MARKETS = [
    { flag: '✈️', region: 'UAE / Middle East', goods: 'Fresh fruit, vegetables, flowers, meat', tip: 'Needs GlobalG.A.P. and phytosanitary certificates.' },
    { flag: '🏰', region: 'European Union', goods: 'Avocado, French beans, coffee, tea, herbs', tip: 'Strict residue limits (MRLs); traceability is required.' },
    { flag: '🎡', region: 'United Kingdom', goods: 'Fresh produce, macadamia, cut flowers', tip: 'Duty-free access for Kenyan goods under the EAC–UK deal.' },
    { flag: '🗽', region: 'United States', goods: 'Coffee, tea, macadamia, nuts', tip: 'Duty-free for many products via AGOA (check current status).' },
    { flag: '🌍', region: 'East Africa (EAC)', goods: 'Maize, beans, dairy, livestock, horticulture', tip: 'Zero duty within the EAC; get a certificate of origin.' },
    { flag: '🐉', region: 'China / Asia', goods: 'Avocado, macadamia, hides and skins, sesame', tip: 'Register your exporter facility with the buyer country authority.' }
  ];

  const TREND = { up: '▲', down: '▼', flat: '▬' };

  // ---------- Currency ----------
  let currency = localStorage.getItem('currency') || 'KES';
  if (!CURRENCIES[currency]) currency = 'KES';

  function convert(kes, code) {
    return kes * CURRENCIES[code].rate;
  }

  function format(amount, code) {
    const digits = amount < 100 && code !== 'KES' ? 2 : 0;
    return `${code} ${amount.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
  }

  async function refreshRates() {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/KES', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !data.rates) return;
      Object.keys(CURRENCIES).forEach(code => {
        if (typeof data.rates[code] === 'number') CURRENCIES[code].rate = data.rates[code];
      });
      renderPrices();
      updateConverter();
      const stamp = document.getElementById('ratesStamp');
      if (stamp) stamp.textContent = 'Live exchange rates';
    } catch (e) {
      // Offline: keep the built-in approximate rates
    }
  }

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderPrices() {
    const grid = document.getElementById('hubPrices');
    if (!grid) return;
    grid.innerHTML = MARKET_PRICES.map(p => `
      <div class="hub-price">
        <div class="hub-price-icon">${p.icon}</div>
        <div class="hub-price-body">
          <div class="hub-price-name">${esc(p.item)}</div>
          <div class="hub-price-value">${format(convert(p.kes, currency), currency)}</div>
        </div>
        <span class="trend trend-${p.trend}" title="Recent direction">${TREND[p.trend]}</span>
      </div>`).join('');
  }

  function updateConverter() {
    const amtEl = document.getElementById('convAmount');
    const fromEl = document.getElementById('convFrom');
    const toEl = document.getElementById('convTo');
    const out = document.getElementById('convResult');
    if (!amtEl || !out) return;
    const amount = parseFloat(amtEl.value) || 0;
    const kes = amount / CURRENCIES[fromEl.value].rate;
    out.textContent = format(convert(kes, toEl.value), toEl.value);
  }

  function buildHub() {
    const host = document.getElementById('hubContent');
    if (!host) return;

    const options = sel => Object.keys(CURRENCIES).map(c => `<option value="${c}" ${c === sel ? 'selected' : ''}>${c} — ${CURRENCIES[c].name}</option>`).join('');

    host.innerHTML = `
      <div class="hub-grid">
        <div class="hub-card hub-wide">
          <div class="hub-card-head">
            <h3>📈 Market prices</h3>
            <label class="hub-select">Show in
              <select id="hubCurrency">${options(currency)}</select>
            </label>
          </div>
          <div id="hubPrices" class="hub-prices"></div>
          <p class="hub-note">Indicative prices only. Always confirm with your local market or buyer. <span id="ratesStamp">Approximate exchange rates</span></p>
        </div>

        <div class="hub-card">
          <h3>💱 Currency converter</h3>
          <div class="conv">
            <div class="amount-control">
              <input id="convAmount" type="number" min="0" step="1" value="1000" class="input" aria-label="Amount">
              <div class="amount-stepper">
                <button type="button" class="amount-step" data-amount-step="1" aria-label="Increase amount">+</button>
                <button type="button" class="amount-step" data-amount-step="-1" aria-label="Decrease amount">−</button>
              </div>
            </div>
            <select id="convFrom" class="input" aria-label="From">${options('KES')}</select>
            <div class="conv-arrow">⬇</div>
            <select id="convTo" class="input" aria-label="To">${options('USD')}</select>
            <div class="conv-result" id="convResult">—</div>
          </div>
        </div>

        <div class="hub-card">
          <h3>🗓️ Planting calendar</h3>
          <div class="hub-list">${CROP_CALENDAR.map(c => `
            <details class="hub-detail">
              <summary>${esc(c.crop)}</summary>
              <p><strong>Plant:</strong> ${esc(c.plant)}</p>
              <p><strong>Harvest:</strong> ${esc(c.harvest)}</p>
              <p class="hub-muted">${esc(c.note)}</p>
            </details>`).join('')}</div>
        </div>

        <div class="hub-card hub-wide">
          <h3>🌍 Export markets</h3>
          <div class="hub-markets">${EXPORT_MARKETS.map(m => `
            <div class="hub-market">
              <div class="hub-flag">${m.flag}</div>
              <div><strong>${esc(m.region)}</strong>
              <div class="hub-muted">${esc(m.goods)}</div>
              <div class="hub-tip">${esc(m.tip)}</div></div>
            </div>`).join('')}</div>
        </div>

        <div class="hub-card hub-wide">
          <h3>💡 Smart farming tips</h3>
          <div class="hub-tips">${TIPS.map(t => `
            <div class="hub-tipcard"><div class="hub-tipicon">${t.icon}</div><strong>${esc(t.title)}</strong><p>${esc(t.text)}</p></div>`).join('')}</div>
        </div>
      </div>`;

    renderPrices();
    updateConverter();

    document.getElementById('hubCurrency').addEventListener('change', e => {
      currency = e.target.value;
      localStorage.setItem('currency', currency);
      renderPrices();
    });
    ['convAmount', 'convFrom', 'convTo'].forEach(id => {
      document.getElementById(id).addEventListener('input', updateConverter);
    });
    document.querySelectorAll('[data-amount-step]').forEach(button => {
      button.addEventListener('click', () => {
        const amount = document.getElementById('convAmount');
        const step = Number(button.dataset.amountStep);
        amount.value = Math.max(0, (Number(amount.value) || 0) + step);
        amount.dispatchEvent(new Event('input', { bubbles: true }));
        amount.focus();
      });
    });
  }

  // ---------- PWA ----------
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstall = e;
    const b = document.getElementById('installBtn');
    if (b) b.classList.remove('hidden');
  });

  window.installApp = async function () {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
    const b = document.getElementById('installBtn');
    if (b) b.classList.add('hidden');
  };

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js?v=9').catch(() => {}));
  }

  // ---------- Scroll reveal ----------
  function setupReveal() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('in-view');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.section, .hub-card').forEach(n => { n.classList.add('reveal'); io.observe(n); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = root.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
    buildHub();
    setupReveal();
    refreshRates();
  });
})();
