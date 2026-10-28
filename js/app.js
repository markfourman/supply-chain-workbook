/* Supply Chain Workbook - core: the skill-testing gate, theme, sheet tabs, shared builders and the frame loop.
   Each lesson is a "sheet" registered with SCW.register({...}) in the sheets-*.js files. */
(function () {
  'use strict';
  const SCW = (window.SCW = { sheets: [], current: null, inst: null });
  const $ = (id) => document.getElementById(id);

  // ---------- tiny helpers ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined) el.append(kid);
    return el;
  }
  SCW.h = h;
  SCW.css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  SCW.fmt = (n, d = 0) => Number(n).toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d });
  SCW.money = (n) => (n < 0 ? '−$' : '$') + SCW.fmt(Math.abs(Math.round(n)));
  SCW.rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  SCW.register = (sheet) => SCW.sheets.push(sheet);

  // Sizes a canvas to its box at the screen's pixel density and returns a ready-to-draw context.
  SCW.fit = function (canvas) {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(50, r.width), ht = Math.max(50, r.height);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(ht * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(ht * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, ht);
    return { ctx, w, h: ht };
  };

  SCW.roundRect = function (ctx, x, y, w, ht, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + ht, r);
    ctx.arcTo(x + w, y + ht, x, y + ht, r);
    ctx.arcTo(x, y + ht, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // A dashboard tile: label, big value and a one-line note. tone colours the outline (good / bad / neutral).
  SCW.kpi = function (label, note) {
    const val = h('b', { class: 'kpi-val', text: '–' });
    const sub = h('span', { class: 'kpi-note', text: note || '' });
    const el = h('div', { class: 'kpi' }, h('span', { class: 'kpi-label', text: label }), val, sub);
    return {
      el,
      set(v, tone, n) {
        val.textContent = v;
        el.dataset.tone = tone || '';
        if (n !== undefined) sub.textContent = n;
      },
    };
  };

  SCW.slider = function (label, min, max, step, value, onInput, format) {
    const id = 'r' + Math.random().toString(36).slice(2, 8);
    const out = h('output', { for: id, class: 'slider-val' });
    const input = h('input', { type: 'range', id, min, max, step, value });
    const show = () => { out.textContent = format ? format(+input.value) : input.value; };
    input.addEventListener('input', () => { show(); onInput(+input.value); });
    show();
    const el = h('div', { class: 'slider' }, h('label', { for: id, text: label }), out, input);
    return { el, input, set(v) { input.value = v; show(); } };
  };

  SCW.toggle = function (label, onChange, pressed) {
    const b = h('button', { type: 'button', class: 'btn toggle', 'aria-pressed': String(!!pressed), text: label });
    b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      onChange(on);
    });
    return b;
  };

  SCW.button = (label, onClick, cls) => h('button', { type: 'button', class: 'btn ' + (cls || 'btn-quiet'), text: label, onclick: onClick });

  // The standard sheet layout: heading, an interactive card, a dashboard card and a plain-language explainer.
  function buildSheet(s) {
    const stage = h('div', { class: 'stage' });
    const controls = h('div', { class: 'controls' });
    const kpis = h('div', { class: 'kpis', 'aria-live': 'polite' });
    const extra = h('div', { class: 'extra' });
    const section = h('section', { class: 'sheet', id: 'sheet-' + s.id, style: '--accent: var(' + s.accent + ')' },
      h('header', { class: 'sheet-head' }, h('h2', { text: s.title }), h('p', { class: 'lead', text: s.lead })),
      h('div', { class: 'panes' },
        h('div', { class: 'card card-sim' }, stage, controls),
        h('div', { class: 'card card-dash' }, h('h3', { class: 'card-title', text: 'Dashboard' }), kpis, extra)),
      s.explain ? h('div', { class: 'card card-explain' },
        h('div', null, h('h3', { text: 'What you’re seeing' }), h('p', { text: s.explain.see })),
        h('div', null, h('h3', { text: 'Try this' }), h('p', { text: s.explain.try })),
        h('div', null, h('h3', { text: 'Why it matters' }), h('p', { text: s.explain.why }))) : null);
    return { section, stage, controls, kpis, extra };
  }

  // ---------- sheets and tabs ----------
  function show(id, focus) {
    const s = SCW.sheets.find((x) => x.id === id) || SCW.sheets[0];
    if (SCW.inst && SCW.inst.destroy) SCW.inst.destroy();
    const area = $('sheetArea');
    area.innerHTML = '';
    area.style.setProperty('--accent', 'var(' + s.accent + ')');
    const parts = buildSheet(s);
    area.append(parts.section);
    SCW.current = s;
    SCW.inst = s.mount(parts) || {};
    $('nameBox').textContent = s.name;
    $('formula').textContent = s.formula;
    for (const t of document.querySelectorAll('.tab')) {
      const on = t.dataset.id === s.id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    }
    if (location.hash !== '#' + s.id) history.replaceState(null, '', '#' + s.id);
    area.scrollTop = 0;
    if (focus) area.focus({ preventScroll: true });
  }

  function buildTabs() {
    const nav = $('tabs');
    SCW.sheets.forEach((s, i) => {
      const t = h('button', {
        type: 'button', role: 'tab', class: 'tab', 'data-id': s.id, 'aria-controls': 'sheetArea',
        style: '--accent: var(' + s.accent + ')', text: s.tab,
        onclick: () => show(s.id, true),
      });
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + SCW.sheets.length) % SCW.sheets.length;
        show(SCW.sheets[j].id);
        document.querySelector('.tab[data-id="' + SCW.sheets[j].id + '"]').focus();
      });
      nav.append(t);
    });
  }

  // ---------- theme ----------
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('scw-theme', t); } catch (e) { /* private mode */ }
    const b = $('themeBtn');
    b.textContent = t === 'dark' ? 'Light mode' : 'Dark mode';
    b.setAttribute('aria-pressed', String(t === 'dark'));
    if (SCW.inst && SCW.inst.redraw) SCW.inst.redraw();
  }

  // ---------- skill-testing question ----------
  // a × b + c ÷ d − e, always a whole-number answer above zero. Order of operations does the rest.
  const gate = { a: 0, b: 0, c: 0, d: 0, e: 0, answer: 0 };
  function newQuestion() {
    const r = SCW.rand;
    gate.a = r(3, 12); gate.b = r(3, 12); gate.d = r(2, 9); gate.c = gate.d * r(2, 12);
    gate.e = r(1, gate.a * gate.b - 1);
    gate.answer = gate.a * gate.b + gate.c / gate.d - gate.e;
    $('gateExpr').textContent = gate.a + ' × ' + gate.b + ' + ' + gate.c + ' ÷ ' + gate.d + ' − ' + gate.e;
    $('gateMsg').textContent = '';
    $('gateSteps').hidden = true;
    $('gateInput').value = '';
  }
  function showSteps() {
    const g = gate, ab = g.a * g.b, cd = g.c / g.d;
    $('gateSteps').innerHTML = '';
    $('gateSteps').append(
      h('li', { text: 'Multiply and divide first: ' + g.a + ' × ' + g.b + ' = ' + ab + ', and ' + g.c + ' ÷ ' + g.d + ' = ' + cd + '.' }),
      h('li', { text: 'Then add and subtract from left to right: ' + ab + ' + ' + cd + ' − ' + g.e + '.' }));
    $('gateSteps').hidden = false;
  }
  function openApp() {
    $('gate').hidden = true;
    $('app').removeAttribute('inert');
    try { sessionStorage.setItem('scw-open', '1'); } catch (e) { /* ignore */ }
    show(location.hash.slice(1), true);
  }
  function bindGate() {
    $('gateForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = parseInt($('gateInput').value.replace(/[^0-9-]/g, ''), 10);
      if (v === gate.answer) { $('gateMsg').textContent = 'Correct. Opening the workbook.'; setTimeout(openApp, 350); return; }
      $('gateMsg').textContent = Number.isNaN(v)
        ? 'Type a whole number, then press Open workbook.'
        : 'Not quite. Multiply and divide before you add and subtract (BEDMAS), then try again.';
      $('gateInput').select();
    });
    $('gateHint').addEventListener('click', showSteps);
    $('gateNew').addEventListener('click', () => { newQuestion(); $('gateInput').focus(); });
  }

  // ---------- frame loop ----------
  let last = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, last ? (t - last) / 1000 : 0);
    last = t;
    if ($('gate').hidden && SCW.inst && SCW.inst.tick && !document.hidden) {
      try { SCW.inst.tick(dt); } catch (err) { console.error(err); }
    }
  }

  function start() {
    buildTabs();
    bindGate();
    $('themeBtn').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    setTheme(document.documentElement.dataset.theme || 'light');
    window.addEventListener('hashchange', () => { if ($('gate').hidden) show(location.hash.slice(1)); });
    window.addEventListener('resize', () => { if (SCW.inst && SCW.inst.redraw) SCW.inst.redraw(); });
    let open = false;
    try { open = sessionStorage.getItem('scw-open') === '1'; } catch (e) { /* ignore */ }
    if (open) openApp();
    else { newQuestion(); $('gateInput').focus(); }
    requestAnimationFrame(frame);
  }
  window.addEventListener('DOMContentLoaded', start);
})();
