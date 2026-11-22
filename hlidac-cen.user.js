// ==UserScript==
// @name         Hlídač cen
// @name:en      Price history for Czech shops
// @namespace    https://github.com/kasparek-net
// @description  Lightweight price history on Czech and Slovak shops using the public Hlídač Shopů API.
// @version      2.1
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
// @grant        GM.xmlHttpRequest
// @connect      api.hlidacshopu.cz
// ==/UserScript==

(() => {
  const BOX_ID = 'aph-box';
  const cur = location.hostname.endsWith('.sk') ? '€' : 'Kč';
  const INLINE = ['.price-detail__price-box-wrapper', '.price-detail__buy-actions'];
  let lastUrl = null;

  const pageUrl = () => location.href.split('#')[0];
  const fmt = n => typeof n !== 'number' ? '–' : `${n.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} ${cur}`;
  const fmtDate = s => s ? new Date(s).toLocaleDateString('cs-CZ') : '–';
  const pct = d => typeof d !== 'number' ? null : Math.round(d * 100);

  const style = `
    #${BOX_ID}{margin:12px 0;padding:10px 12px;border:1px solid rgba(128,128,128,.35);border-radius:8px;font:13px/1.4 system-ui,sans-serif;color:inherit;box-sizing:border-box}
    #${BOX_ID}.aph-float{position:fixed;left:16px;bottom:16px;z-index:2147483646;width:340px;max-width:calc(100vw - 32px);margin:0;background:#fff;color:#222;box-shadow:0 4px 16px rgba(0,0,0,.2)}
    @media (prefers-color-scheme: dark){#${BOX_ID}.aph-float{background:#222;color:#eee}}
    #${BOX_ID} .aph-head{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px}
    #${BOX_ID} b{font-weight:600}
    #${BOX_ID} .aph-good{color:#1a9b4b}
    #${BOX_ID} .aph-bad{color:#d33}
    #${BOX_ID} .aph-muted{opacity:.65}
    #${BOX_ID} .aph-x{all:unset;cursor:pointer;opacity:.6;padding:0 4px}
    #${BOX_ID} svg{display:block;width:100%;height:70px}
    #${BOX_ID}.aph-min .aph-body{display:none}
  `;

  function chart(points) {
    const pts = points.filter(p => typeof p.y === 'number');
    if (pts.length < 2) return '';
    const W = 300, H = 70, P = 4;
    const xs = pts.map(p => +new Date(p.x));
    const ys = pts.map(p => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const sx = x => P + (x - x0) / (x1 - x0 || 1) * (W - 2 * P);
    const sy = y => H - P - (y - y0) / (y1 - y0 || 1) * (H - 2 * P);
    let d = '';
    pts.forEach((p, i) => {
      const X = sx(+new Date(p.x)).toFixed(1), Y = sy(p.y).toFixed(1);
      d += i ? ` H${X} V${Y}` : `M${X} ${Y}`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${d}" fill="none" stroke="#2f7de1" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
    </svg>
    <div class="aph-head aph-muted"><span>${fmtDate(pts[0].x)}</span><span>min ${fmt(y0)} · max ${fmt(y1)}</span><span>${fmtDate(pts.at(-1).x)}</span></div>`;
  }

  function render(json, floating) {
    const m = json.metadata || {};
    const real = pct(m.realDiscount), claimed = pct(m.claimedDiscount);
    const cls = real == null ? '' : real > 0 ? 'aph-good' : real < 0 ? 'aph-bad' : '';
    const realTxt = real == null ? '–' : real > 0 ? `−${real} %` : real < 0 ? `dražší o ${-real} %` : 'beze změny';
    return `
      <div class="aph-head">
        <span>Běžná cena: <b>${fmt(m.commonPrice)}</b></span>
        <span>Skutečná sleva: <b class="${cls}">${realTxt}</b>${claimed ? ` <span class="aph-muted">(obchod uvádí −${claimed} %)</span>` : ''}${floating ? ' <button class="aph-x" title="Sbalit">▾</button>' : ''}</span>
      </div>
      <div class="aph-body">
        ${chart(json.data?.currentPrice || [])}
        <div class="aph-muted">Poslední sleva ${fmtDate(m.lastDiscountDate)} · zdražení ${fmtDate(m.lastIncreaseDate)} · data Hlídač Shopů</div>
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
    if (url === lastUrl) return;
    lastUrl = url;
    document.getElementById(BOX_ID)?.remove();

    let json;
    try {
      json = await getJson(`https://api.hlidacshopu.cz/v2/detail?${new URLSearchParams({ url })}`);
    } catch (e) {
      return;
    }
    if (url !== pageUrl() || !json.data?.currentPrice?.some(p => typeof p.y === 'number')) return;

    const anchor = INLINE.map(s => document.querySelector(s)).find(Boolean);
    const box = document.createElement('div');
    box.id = BOX_ID;
    box.innerHTML = render(json, !anchor);
    if (anchor) {
      anchor.after(box);
    } else {
      box.classList.add('aph-float');
      box.addEventListener('click', e => {
        if (!e.target.closest('.aph-x')) return;
        box.classList.toggle('aph-min');
        e.target.textContent = box.classList.contains('aph-min') ? '▴' : '▾';
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
