// ==UserScript==
// @name         Hlídač cen
// @name:en      Price history for Czech shops
// @namespace    https://github.com/kasparek-net
// @description  Lightweight price history on Czech and Slovak shops using the public Hlídač Shopů API.
// @description:cs Historie cen za poslední rok, běžná cena a skutečná sleva na Alze, Datartu, Mallu, Notinu a dalších českých a slovenských e‑shopech. Data z Hlídače Shopů.
// @version      2.4.0
// @license      MIT
// @homepageURL  https://github.com/kasparek-net/hlidac-cen
// @updateURL    https://raw.githubusercontent.com/kasparek-net/hlidac-cen/main/hlidac-cen.user.js
// @downloadURL  https://raw.githubusercontent.com/kasparek-net/hlidac-cen/main/hlidac-cen.user.js
// @match        https://www.4camping.cz/p/*
// @match        https://www.4camping.sk/p/*
// @match        https://www.aaaauto.cz/*
// @match        https://www.aaaauto.sk/*
// @match        https://www.albert.cz/*
// @match        https://www.alza.cz/*
// @match        https://www.alza.sk/*
// @match        https://m.alza.cz/*
// @match        https://m.alza.sk/*
// @match        https://www.autoesa.cz/*
// @match        https://www.benu.cz/*
// @match        https://shop.billa.cz/*
// @match        https://www.datart.cz/*
// @match        https://www.datart.sk/*
// @match        https://www.dm.cz/*
// @match        https://www.mojadm.sk/*
// @match        https://www.eva.cz/*
// @match        https://*.iglobus.cz/*
// @match        https://globusonline.cz/*
// @match        https://www.globusonline.cz/*
// @match        https://www.grizly.cz/*
// @match        https://www.grizly.sk/*
// @match        https://www.hornbach.cz/*
// @match        https://www.hornbach.sk/*
// @match        https://www.ikea.com/cz/*
// @match        https://nakup.itesco.cz/*
// @match        https://potravinydomov.itesco.sk/*
// @match        https://www.kaufland.cz/*
// @match        https://www.knihydobrovsky.cz/*
// @match        https://www.kosik.cz/*
// @match        https://www.lekarna.cz/*
// @match        https://www.lidl.cz/*
// @match        https://www.mall.cz/*
// @match        https://www.mall.sk/*
// @match        https://www.megapixel.cz/*
// @match        https://www.mironet.cz/*
// @match        https://www.mountfield.cz/*
// @match        https://www.mountfield.sk/*
// @match        https://www.notino.cz/*
// @match        https://www.notino.sk/*
// @match        https://www.obi.cz/*
// @match        https://www.obi.sk/*
// @match        https://www.okay.cz/*
// @match        https://www.okay.sk/*
// @match        https://www.pilulka.cz/*
// @match        https://www.pilulka.sk/*
// @match        https://www.rohlik.cz/*
// @match        https://www.tchibo.cz/*
// @match        https://www.tchibo.sk/*
// @match        https://www.tetadrogerie.cz/*
// @match        https://www.tsbohemia.cz/*
// @run-at       document-idle
// @noframes
// @grant        GM.xmlHttpRequest
// @connect      api.hlidacshopu.cz
// ==/UserScript==

(() => {
  if (window.__hlidacCen) return;
  window.__hlidacCen = true;

  const BOX_ID = 'aph-box';
  const cur = location.hostname.endsWith('.sk') ? '€' : 'Kč';
  const INLINE = ['.price-detail__row', '.price-detail__buy-actions', '.cart-section-one'];
  const findAnchor = () => INLINE.map(s => document.querySelector(s)).find(Boolean);
  let lastUrl = null;
  let inlineBox = null;

  const pageUrl = () => {
    const dq = location.hostname.includes('alza.') && new URLSearchParams(location.search).get('dq');
    return location.origin + location.pathname + (dq ? `?dq=${encodeURIComponent(dq)}` : '');
  };
  const num = n => n.toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
  const fmt = n => typeof n !== 'number' ? '–' : `${num(n)} ${cur}`;
  const fmtDate = (s, year = true) => s
    ? new Date(s).toLocaleDateString('cs-CZ', year ? { day: 'numeric', month: 'numeric', year: 'numeric' } : { day: 'numeric', month: 'numeric' })
    : '–';
  const pct = d => typeof d !== 'number' ? null : Math.round(d * 100);

  const style = `
    #${BOX_ID}{--aph-bg:#fff;--aph-fg:#1d1d1f;--aph-muted:#6e6e73;--aph-line:#e3e3e8;--aph-blue:#2f6fde;--aph-good:#1b8a4b;--aph-good-bg:#e5f5ec;--aph-bad:#c62828;--aph-bad-bg:#fdecec;--aph-neutral-bg:#f0f0f3;
      all:initial;display:block;box-sizing:border-box;width:100%;margin:12px 0;padding:14px 16px;border:1px solid var(--aph-line);border-radius:12px;background:var(--aph-bg);color:var(--aph-fg);
      font:13px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-variant-numeric:tabular-nums;text-align:left}
    @media (prefers-color-scheme: dark){#${BOX_ID}{--aph-bg:#1f1f22;--aph-fg:#f2f2f5;--aph-muted:#9a9aa2;--aph-line:#38383d;--aph-blue:#6a9cff;--aph-good:#4cc97f;--aph-good-bg:#173524;--aph-bad:#ff6b6b;--aph-bad-bg:#3d1c1c;--aph-neutral-bg:#2c2c30}}
    #${BOX_ID} *{box-sizing:border-box}
    #${BOX_ID}.aph-float{position:fixed;left:16px;bottom:16px;z-index:2147483646;width:360px;max-width:calc(100vw - 32px);margin:0;box-shadow:0 8px 28px rgba(0,0,0,.18)}
    #${BOX_ID} .aph-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
    #${BOX_ID} .aph-title{font-weight:600;font-size:13px}
    #${BOX_ID} .aph-title span{font-weight:400;color:var(--aph-muted)}
    #${BOX_ID} .aph-src{color:var(--aph-muted);text-decoration:none;font-size:12px;white-space:nowrap}
    #${BOX_ID} .aph-src:hover{text-decoration:underline}
    #${BOX_ID} .aph-x{all:unset;cursor:pointer;color:var(--aph-muted);font-size:14px;padding:0 2px;margin-left:6px}
    #${BOX_ID} .aph-stats{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
    #${BOX_ID} .aph-stat{display:flex;flex-direction:column;padding:6px 10px;border-radius:8px;background:var(--aph-neutral-bg);min-width:0}
    #${BOX_ID} .aph-stat small{font-size:11px;color:var(--aph-muted);white-space:nowrap}
    #${BOX_ID} .aph-stat b{font-size:15px;font-weight:600;white-space:nowrap}
    #${BOX_ID} .aph-stat.good{background:var(--aph-good-bg)}#${BOX_ID} .aph-stat.good b{color:var(--aph-good)}
    #${BOX_ID} .aph-stat.bad{background:var(--aph-bad-bg)}#${BOX_ID} .aph-stat.bad b{color:var(--aph-bad)}
    #${BOX_ID} .aph-chart{position:relative;height:84px;margin:0 0 4px}
    #${BOX_ID} .aph-chart svg{position:absolute;top:0;bottom:0;left:0;right:64px;width:calc(100% - 64px);height:100%;overflow:visible}
    #${BOX_ID} .aph-ylab{position:absolute;right:0;width:58px;text-align:right;font-size:11px;color:var(--aph-muted);transform:translateY(-50%);white-space:nowrap}
    #${BOX_ID} .aph-ylab.cur{color:var(--aph-blue);font-weight:600}
    #${BOX_ID} .aph-dot{position:absolute;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:var(--aph-blue);box-shadow:0 0 0 3px var(--aph-bg)}
    #${BOX_ID} .aph-x-axis{display:flex;justify-content:space-between;font-size:11px;color:var(--aph-muted);margin:0 64px 8px 0}
    #${BOX_ID} .aph-foot{font-size:12px;color:var(--aph-muted);border-top:1px solid var(--aph-line);padding-top:8px}
    #${BOX_ID}.aph-min .aph-body{display:none}
    #${BOX_ID}.aph-min .aph-top{margin-bottom:0}
  `;

  function labels(y0, y1, now, Y) {
    const near = (a, b) => Math.abs(Y(a) - Y(b)) < 18;
    const out = [`<span class="aph-ylab cur" style="top:${Y(now)}%">${fmt(now)}</span>`];
    if (!near(y1, now)) out.push(`<span class="aph-ylab" style="top:${Y(y1)}%">${fmt(y1)}</span>`);
    if (!near(y0, now) && !near(y0, y1)) out.push(`<span class="aph-ylab" style="top:${Y(y0)}%">${fmt(y0)}</span>`);
    return out.join('');
  }

  function chart(points, common) {
    const pts = points.filter(p => typeof p.y === 'number');
    if (pts.length < 2) return '';
    const xs = pts.map(p => +new Date(p.x));
    const ys = pts.map(p => p.y);
    const x0 = xs[0], x1 = xs.at(-1);
    let y0 = Math.min(...ys), y1 = Math.max(...ys);
    if (typeof common === 'number') { y0 = Math.min(y0, common); y1 = Math.max(y1, common); }
    const pad = (y1 - y0) * 0.12 || y1 * 0.05 || 1;
    const lo = y0 - pad, hi = y1 + pad;
    const X = x => (x - x0) / (x1 - x0 || 1) * 100;
    const Y = y => (hi - y) / (hi - lo) * 100;
    let line = '';
    pts.forEach((p, i) => {
      line += i ? ` H${X(xs[i]).toFixed(2)} V${Y(p.y).toFixed(2)}` : `M0 ${Y(p.y).toFixed(2)}`;
    });
    const area = `${line} V100 H0 Z`;
    const last = pts.at(-1);
    const commonLine = typeof common === 'number'
      ? `<line x1="0" x2="100" y1="${Y(common)}" y2="${Y(common)}" stroke="var(--aph-muted)" stroke-dasharray="3 3" stroke-width="1" vector-effect="non-scaling-stroke"/>`
      : '';
    return `
      <div class="aph-chart">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="aph-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--aph-blue)" stop-opacity=".22"/><stop offset="1" stop-color="var(--aph-blue)" stop-opacity="0"/>
          </linearGradient></defs>
          <path d="${area}" fill="url(#aph-g)"/>
          ${commonLine}
          <path d="${line}" fill="none" stroke="var(--aph-blue)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
        </svg>
        ${labels(Math.min(...ys), Math.max(...ys), last.y, Y)}
        <span class="aph-dot" style="left:calc(100% - 64px);top:${Y(last.y)}%"></span>
      </div>
      <div class="aph-x-axis"><span>${fmtDate(pts[0].x)}</span><span>dnes</span></div>`;
  }

  function render(json, floating, url) {
    const m = json.metadata || {};
    const real = pct(m.realDiscount), claimed = pct(m.claimedDiscount);
    let diff;
    if (real == null) diff = '';
    else if (real > 0) diff = `<div class="aph-stat good"><small>Skutečná sleva</small><b>−${real} %</b></div>`;
    else if (real < 0) diff = `<div class="aph-stat bad"><small>Oproti běžné ceně</small><b>+${-real} %</b></div>`;
    else diff = `<div class="aph-stat"><small>Oproti běžné ceně</small><b>stejně</b></div>`;
    const claimedStat = claimed ? `<div class="aph-stat"><small>Obchod uvádí slevu</small><b>−${claimed} %</b></div>` : '';
    const foot = [
      m.lastDiscountDate && `poslední sleva ${fmtDate(m.lastDiscountDate)}`,
      m.lastIncreaseDate && `zdražení ${fmtDate(m.lastIncreaseDate)}`,
    ].filter(Boolean).join(' · ');
    const link = `https://www.hlidacshopu.cz/app/?url=${encodeURIComponent(url)}`;
    return `
      <div class="aph-top">
        <div class="aph-title">Historie ceny <span>· 1 rok</span></div>
        <div><a class="aph-src" href="${link}" target="_blank" rel="noopener">Hlídač Shopů ↗</a>${floating ? '<button class="aph-x" title="Sbalit">▾</button>' : ''}</div>
      </div>
      <div class="aph-body">
        <div class="aph-stats">
          <div class="aph-stat"><small>Běžná cena</small><b>${fmt(m.commonPrice)}</b></div>
          ${diff}${claimedStat}
        </div>
        ${chart(json.data?.currentPrice || [], m.commonPrice)}
        ${foot ? `<div class="aph-foot">${foot.charAt(0).toUpperCase() + foot.slice(1)}</div>` : ''}
      </div>`;
  }

  function getJson(api) {
    if (typeof GM !== 'undefined' && GM.xmlHttpRequest) {
      return new Promise((resolve, reject) => GM.xmlHttpRequest({
        method: 'GET',
        url: api,
        onload: r => r.status === 200 || r.status === 404 ? resolve(JSON.parse(r.responseText)) : reject(r.status),
        onerror: reject,
      }));
    }
    return fetch(api).then(r => r.json());
  }

  async function run() {
    const url = pageUrl();
    if (url === lastUrl) {
      // Shops that re-render the product block throw the box away with it.
      if (inlineBox && !inlineBox.isConnected) findAnchor()?.after(inlineBox);
      return;
    }
    lastUrl = url;
    inlineBox = null;
    document.getElementById(BOX_ID)?.remove();

    let json;
    try {
      json = await getJson(`https://api.hlidacshopu.cz/v2/detail?${new URLSearchParams({ url })}`);
    } catch (e) {
      return;
    }
    if (url !== pageUrl() || !json.data?.currentPrice?.some(p => typeof p.y === 'number')) return;

    document.getElementById(BOX_ID)?.remove();
    const anchor = findAnchor();
    const box = document.createElement('div');
    box.id = BOX_ID;
    box.innerHTML = render(json, !anchor, url);
    if (anchor) {
      anchor.after(box);
      inlineBox = box;
    } else {
      box.classList.add('aph-float');
      box.addEventListener('click', e => {
        const btn = e.target.closest('.aph-x');
        if (!btn) return;
        box.classList.toggle('aph-min');
        btn.textContent = box.classList.contains('aph-min') ? '▴' : '▾';
      });
      document.body.appendChild(box);
    }
  }

  const s = document.createElement('style');
  s.textContent = style;
  document.head.appendChild(s);

  run();
  setInterval(run, 1500);
})();
