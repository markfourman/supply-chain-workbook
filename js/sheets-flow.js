/* Supply Chain Workbook - sheets 1 to 3: the bottleneck, the bullwhip effect and the IT gap. */
(function () {
  'use strict';
  const { h, fit, kpi, fmt, css, roundRect, rand } = SCW;
  const FONT = '600 13px Figtree, system-ui, sans-serif';

  // ======================================================================
  // 1. THE BOTTLENECK
  // ======================================================================
  SCW.register({
    id: 'bottleneck', tab: 'Bottleneck', accent: '--c-orange', name: 'THROUGHPUT',
    formula: '= MIN(Receive, Assemble, Pack)    Lead time = WIP ÷ Throughput',
    title: 'The bottleneck',
    lead: 'A line can only go as fast as its slowest step.',
    explain: {
      see: 'Boxes arrive and move left to right through three stations. Each station handles a set number of boxes per minute. Boxes pile up in front of the slowest one: the bottleneck.',
      try: 'Press + on Receive or Pack. Throughput doesn’t move, and the pile only grows. Now press + on the bottleneck and watch throughput climb until a new station becomes the slowest.',
      why: 'Improving any step except the bottleneck is wasted effort. That’s the Theory of Constraints. Little’s Law shows the cost of the pile: more work waiting means a longer lead time for every order.',
    },
    mount(p) {
      const st = [{ n: 'Receive', cap: 6 }, { n: 'Assemble', cap: 3 }, { n: 'Pack', cap: 5 }];
      const ARRIVALS = 7;
      let q, prog, util, done, simT, arr, kpiT = 0;
      const reset = () => { q = [0, 0, 0]; prog = [0, 0, 0]; util = [0, 0, 0]; done = []; simT = 0; arr = 0; };
      reset();

      const canvas = h('canvas', { class: 'sim-canvas', role: 'img', 'aria-label': 'Boxes waiting and moving through the Receive, Assemble and Pack stations' });
      p.stage.append(canvas);
      st.forEach((s) => {
        const val = h('b', { class: 'step-val', text: s.cap + ' / min' });
        const change = (d) => { s.cap = Math.max(1, Math.min(10, s.cap + d)); val.textContent = s.cap + ' / min'; };
        p.controls.append(h('div', { class: 'stepper' },
          h('span', { class: 'step-name', text: s.n }),
          h('button', { type: 'button', class: 'btn btn-quiet step-btn', 'aria-label': 'Slow down ' + s.n, text: '−', onclick: () => change(-1) }),
          val,
          h('button', { type: 'button', class: 'btn btn-quiet step-btn', 'aria-label': 'Speed up ' + s.n, text: '+', onclick: () => change(1) })));
      });
      p.controls.append(SCW.button('Start over', reset));

      const kT = kpi('Throughput', 'boxes finished per minute');
      const kW = kpi('Work in progress', 'boxes waiting in the line');
      const kL = kpi('Lead time', 'Little’s Law: WIP ÷ throughput');
      const kB = kpi('Bottleneck', 'the slowest station');
      p.kpis.append(kT.el, kW.el, kL.el, kB.el);
      p.extra.append(h('p', { class: 'note', text: 'Boxes arrive at 7 per minute. One second here is one minute on the floor.' }));

      const slowest = () => st.reduce((b, s, i) => (s.cap < st[b].cap ? i : b), 0);

      function step(dt) {
        simT += dt;
        arr += ARRIVALS * dt;
        while (arr >= 1) { arr -= 1; if (q[0] < 80) q[0]++; }
        for (let i = 0; i < 3; i++) {
          const busy = q[i] > 0;
          util[i] += ((busy ? 1 : 0) - util[i]) * (1 - Math.exp(-dt / 4));
          if (!busy) { prog[i] = 0; continue; }
          prog[i] += st[i].cap * dt;
          while (prog[i] >= 1 && q[i] > 0) {
            prog[i] -= 1;
            q[i]--;
            if (i < 2) q[i + 1]++; else done.push(simT);
          }
        }
        while (done.length && done[0] < simT - 10) done.shift();
      }

      function draw() {
        const { ctx, w, h: H } = fit(canvas);
        const ink = css('--ink'), soft = css('--ink-soft'), card = css('--sheet'), acc = css('--c-orange'), box = css('--c-blue'), good = css('--c-green');
        const colW = w / 3, b = slowest();
        ctx.textBaseline = 'middle';
        const narrow = w < 560;
        ctx.font = narrow ? '600 12px Figtree, system-ui, sans-serif' : FONT;
        for (let i = 0; i < 3; i++) {
          const x0 = i * colW + 6;
          // Wide screens: queue on the left of each station. Narrow screens: station on top, queue below it.
          const qx = x0, qW = narrow ? colW - 12 : colW * 0.46;
          const sx = narrow ? x0 : x0 + qW + 6, sw = narrow ? colW - 12 : colW - qW - 18;
          const sy = narrow ? 24 : H * 0.3, sh = narrow ? 74 : H * 0.38;
          const qTop = narrow ? sy + sh + 26 : 8;
          const cell = narrow ? 9 : 10, cols = Math.max(1, Math.floor(qW / cell)), rows = Math.max(1, Math.floor((H - 28 - qTop) / cell));
          const shown = Math.min(q[i], cols * rows);
          ctx.fillStyle = box;
          for (let k = 0; k < shown; k++) {
            const c = k % cols, r = Math.floor(k / cols);
            ctx.fillRect(qx + c * cell, H - 28 - (r + 1) * cell, cell - 2, cell - 2);
          }
          ctx.fillStyle = soft;
          ctx.textAlign = 'left';
          ctx.fillText('Waiting: ' + q[i] + (q[i] > shown ? ' (+' + (q[i] - shown) + ')' : ''), qx, H - 12);
          roundRect(ctx, sx, sy, sw, sh, 10);
          ctx.fillStyle = card;
          ctx.fill();
          ctx.lineWidth = i === b ? 4 : 2;
          ctx.strokeStyle = i === b ? acc : soft;
          ctx.stroke();
          ctx.fillStyle = ink;
          ctx.textAlign = 'center';
          ctx.fillText(st[i].n, sx + sw / 2, sy + 18);
          ctx.fillText(st[i].cap + ' / min', sx + sw / 2, sy + 38);
          ctx.fillStyle = css('--grid');
          ctx.fillRect(sx + 10, sy + sh - 16, sw - 20, 6);
          ctx.fillStyle = i === b ? acc : good;
          ctx.fillRect(sx + 10, sy + sh - 16, (sw - 20) * Math.min(1, prog[i]), 6);
          ctx.fillStyle = soft;
          ctx.fillText('Busy ' + Math.round(util[i] * 100) + '%', sx + sw / 2, sy + sh + 13);
          if (i === b) {
            ctx.fillStyle = acc;
            ctx.fillText('Bottleneck', sx + sw / 2, sy - 12);
          }
        }
      }

      return {
        tick(dt) {
          step(dt);
          draw();
          kpiT -= dt;
          if (kpiT > 0) return;
          kpiT = 0.25;
          const tp = done.length / Math.max(1, Math.min(10, simT));
          const wip = q[0] + q[1] + q[2];
          const b = slowest();
          kT.set(fmt(tp, 1), '');
          kW.set(fmt(wip), wip > 25 ? 'bad' : '');
          kL.set(tp > 0.1 ? fmt(wip / tp, 1) + ' min' : '–', wip / Math.max(tp, 0.1) > 8 ? 'bad' : '');
          kB.set(st[b].n, 'bad');
        },
        redraw: draw,
      };
    },
  });

  // ======================================================================
  // 2. THE BULLWHIP EFFECT
  // ======================================================================
  const TIERS = ['Retailer', 'Wholesaler', 'Distributor', 'Factory'];
  const TIER_COL = ['--c-blue', '--c-green', '--c-purple', '--c-orange'];

  // Weekly simulation. Each tier forecasts from the orders it receives (or from real sales when data is shared),
  // then orders enough to rebuild its stock. Shipments take 2 weeks to arrive.
  function bullwhip(spike, share) {
    const T = 40, L = 2, alpha = 0.4, beta = 0.6;
    const cust = [], orders = TIERS.map(() => []);
    const st = TIERS.map(() => ({ inv: 8 * (L + 1), fc: 8, pipe: [8, 8] }));
    for (let t = 0; t < T; t++) {
      const d0 = 8 + (t >= 6 ? spike : 0);
      cust.push(d0);
      let incoming = d0;
      st.forEach((s, i) => {
        s.inv += s.pipe.shift();
        s.inv -= incoming;
        s.fc = alpha * (share ? d0 : incoming) + (1 - alpha) * s.fc;
        const target = s.fc * (L + 1);
        const pipeTotal = s.pipe.reduce((a, b) => a + b, 0);
        const order = Math.max(0, s.fc + beta * (target - s.inv - pipeTotal));
        s.pipe.push(order);
        orders[i].push(order);
        incoming = order;
      });
    }
    return { cust, orders };
  }

  SCW.register({
    id: 'bullwhip', tab: 'Bullwhip', accent: '--c-purple', name: 'AMPLIFY',
    formula: '= SWING(Factory orders) ÷ SWING(Customer demand)',
    title: 'The bullwhip effect',
    lead: 'A small change in customer demand becomes a huge swing at the factory.',
    explain: {
      see: 'Customers buy 8 units a week, then a little more. Each company up the chain only sees the orders from the company below it, guesses, and orders extra to be safe. Every guess adds to the swing.',
      try: 'Press Replay and watch the factory line. Then turn on Share real sales data, so every tier sees what customers actually bought, and replay.',
      why: 'Swings cost real money: overtime, rush freight, then piles of unsold stock. Sharing point-of-sale data, shorter lead times and steady ordering all calm the whip.',
    },
    mount(p) {
      let share = false, spike = 4, data = bullwhip(spike, share), week = 0, acc = 0;
      const canvas = h('canvas', { class: 'sim-canvas', role: 'img', 'aria-label': 'Line chart of weekly orders at each tier of the supply chain' });
      const chain = h('div', { class: 'chain' });
      p.stage.append(chain, canvas);
      const replay = () => { data = bullwhip(spike, share); week = 0; acc = 0; };
      p.controls.append(
        SCW.button('Replay', replay, 'btn-go'),
        SCW.toggle('Share real sales data', (on) => { share = on; replay(); }),
        SCW.slider('Size of the demand jump', 1, 8, 1, spike, (v) => { spike = v; replay(); }, (v) => '+' + v + ' units').el);

      const kC = kpi('Customer swing', 'change in what people bought');
      const kF = kpi('Factory swing', 'biggest minus smallest order');
      const kA = kpi('Amplification', 'factory swing ÷ customer swing');
      const kP = kpi('Peak factory order', 'units in one week');
      p.kpis.append(kC.el, kF.el, kA.el, kP.el);
      p.extra.append(h('ul', { class: 'legend' },
        h('li', { style: '--sw: var(--ink-soft)', text: 'Customer demand' }),
        TIERS.map((t, i) => h('li', { style: '--sw: var(' + TIER_COL[i] + ')', text: t + ' orders' }))));

      const chainCells = ['Customer'].concat(TIERS).map((t, i) => {
        const v = h('b', { text: '8' });
        chain.append(h('div', { class: 'chain-cell', style: '--sw: var(' + (i === 0 ? '--ink-soft' : TIER_COL[i - 1]) + ')' }, h('span', { text: t }), v));
        return v;
      });

      function draw() {
        const { ctx, w, h: H } = fit(canvas);
        const l = 34, r = 10, t = 12, b = 24, W = w - l - r, Hh = H - t - b;
        const all = data.cust.concat(...data.orders);
        const ymax = Math.max(16, Math.ceil(Math.max(...all) / 4) * 4 + 4);
        const X = (i) => l + (i / 39) * W, Y = (v) => t + Hh - (v / ymax) * Hh;
        ctx.font = '500 11px Figtree, system-ui, sans-serif';
        ctx.fillStyle = css('--ink-soft');
        ctx.strokeStyle = css('--grid');
        ctx.lineWidth = 1;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let g = 0; g <= 4; g++) {
          const v = (ymax / 4) * g;
          ctx.beginPath(); ctx.moveTo(l, Y(v)); ctx.lineTo(w - r, Y(v)); ctx.stroke();
          ctx.fillText(String(Math.round(v)), l - 6, Y(v));
        }
        ctx.textAlign = 'center';
        for (let i = 0; i < 40; i += 5) ctx.fillText('Wk ' + (i + 1), X(i), H - 9);
        const n = Math.max(1, Math.floor(week));
        const lineOf = (arr, col, lw) => {
          ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
          for (let i = 0; i < n && i < arr.length; i++) { if (i) ctx.lineTo(X(i), Y(arr[i])); else ctx.moveTo(X(i), Y(arr[i])); }
          ctx.stroke();
        };
        data.orders.forEach((o, i) => lineOf(o, css(TIER_COL[i]), 2.5));
        lineOf(data.cust, css('--ink'), 3);
      }

      function update() {
        const n = Math.max(1, Math.floor(week));
        const c = data.cust.slice(0, n), f = data.orders[3].slice(0, n);
        const cs = Math.max(...c) - Math.min(...c), fs = Math.max(...f) - Math.min(...f);
        kC.set(fmt(cs), '');
        kF.set(fmt(fs), fs > cs * 2 ? 'bad' : 'good');
        kA.set(cs > 0 ? fmt(fs / cs, 1) + '×' : '–', cs > 0 && fs / cs > 2 ? 'bad' : 'good');
        kP.set(fmt(Math.max(...f)), '');
        chainCells[0].textContent = fmt(c[n - 1]);
        data.orders.forEach((o, i) => { chainCells[i + 1].textContent = fmt(o[n - 1]); });
      }

      return {
        tick(dt) {
          if (week < 40) {
            acc += dt;
            if (acc >= 0.18) { acc = 0; week += 1; update(); }
          }
          draw();
        },
        redraw() { draw(); update(); },
      };
    },
  });

  // ======================================================================
  // 3. THE IT GAP
  // ======================================================================
  SCW.register({
    id: 'itgap', tab: 'IT gap', accent: '--c-blue', name: 'IN_SYNC',
    formula: '= Physical count − System count',
    title: 'The IT gap',
    lead: 'When every team keeps its own spreadsheet, nobody sees the same stock.',
    explain: {
      see: 'One shelf of stock, four teams. Each team copies the count into its own system on its own schedule, and sometimes types it wrong. Sales promises orders from its copy; Purchasing reorders from its copy.',
      try: 'Watch the gaps in red and the broken promises add up. Then press Connect every team to one ERP so everyone reads the same live number.',
      why: 'The gap between what the system says and what is really on the shelf causes broken promises, surprise stockouts and wasted reorders. One shared system of record, like an ERP, closes it.',
    },
    mount(p) {
      let live = false, phys, depts, nextOrder, po, stats, log, renderT = 0;
      const reset = () => {
        phys = 60; nextOrder = 1; po = null; log = [];
        stats = { broken: 0, lost: 0, out: 0, shipped: 0 };
        depts = [{ n: 'Warehouse', every: 2 }, { n: 'Sales', every: 5 }, { n: 'Purchasing', every: 8 }, { n: 'Finance', every: 12 }]
          .map((d) => Object.assign(d, { val: 60, age: 0 }));
      };
      reset();
      const note = (t) => { log.unshift(t); log = log.slice(0, 4); };

      const shelfBar = h('span', { class: 'shelf-fill' });
      const shelfNum = h('b', { class: 'shelf-num' });
      const grid = h('div', { class: 'dept-grid' });
      const logEl = h('ul', { class: 'log' });
      p.stage.append(
        h('div', { class: 'shelf' }, h('span', { class: 'shelf-label', text: 'Real stock on the shelf' }), shelfNum, h('span', { class: 'shelf-track' }, shelfBar)),
        grid, logEl);
      const cards = depts.map((d) => {
        const v = h('b', { class: 'dept-val' }), age = h('span', { class: 'dept-age' }), gap = h('span', { class: 'dept-gap' });
        const el = h('div', { class: 'dept' }, h('span', { class: 'dept-name', text: d.n }), v, age, gap);
        grid.append(el);
        return { el, v, age, gap };
      });
      p.controls.append(
        SCW.toggle('Connect every team to one ERP', (on) => { live = on; note(on ? 'Every team now reads one live system.' : 'Back to separate spreadsheets.'); }),
        SCW.button('Start over', () => { reset(); render(); }));

      const kB = kpi('Broken promises', 'sold, but the shelf was empty');
      const kL = kpi('Lost sales', 'refused, though stock existed');
      const kO = kpi('Time out of stock', 'seconds with an empty shelf');
      const kS = kpi('Records out of sync', 'teams with the wrong number');
      p.kpis.append(kB.el, kL.el, kO.el, kS.el);

      function render() {
        shelfNum.textContent = fmt(phys) + ' units';
        shelfBar.style.width = Math.min(100, (phys / 110) * 100) + '%';
        let off = 0;
        depts.forEach((d, i) => {
          const c = cards[i], diff = Math.round(d.val - phys);
          c.v.textContent = fmt(Math.round(d.val));
          c.age.textContent = live ? 'Live' : 'Updated ' + Math.floor(d.age) + ' s ago';
          c.gap.textContent = diff === 0 ? 'Matches the shelf' : 'Off by ' + (diff > 0 ? '+' : '') + diff;
          c.el.dataset.tone = diff === 0 ? 'good' : 'bad';
          if (diff !== 0) off++;
        });
        logEl.innerHTML = '';
        for (const t of log) logEl.append(h('li', { text: t }));
        kB.set(fmt(stats.broken), stats.broken ? 'bad' : 'good');
        kL.set(fmt(stats.lost), stats.lost ? 'bad' : 'good');
        kO.set(fmt(stats.out, 0) + ' s', stats.out > 0.5 ? 'bad' : 'good');
        kS.set(off + ' of 4', off ? 'bad' : 'good');
      }

      return {
        tick(dt) {
          for (const d of depts) {
            d.age += dt;
            if (live) { d.val = phys; d.age = 0; }
            else if (d.age >= d.every) { d.val = phys + (Math.random() < 0.3 ? rand(-6, 6) : 0); d.age = 0; }
          }
          nextOrder -= dt;
          if (nextOrder <= 0) {
            nextOrder = 0.9;
            const qty = rand(1, 4), sales = depts[1];
            if (sales.val >= qty) {
              sales.val -= qty;
              if (phys >= qty) { phys -= qty; stats.shipped++; }
              else { stats.broken++; note('Sales promised ' + qty + ' units, but the shelf only had ' + phys + '.'); }
            } else if (phys >= qty) { stats.lost++; note('Sales turned away an order: its copy said ' + Math.round(sales.val) + '.'); }
          }
          if (po === null && depts[2].val <= 20) { po = 5; note('Purchasing reordered 50 units (its copy said ' + Math.round(depts[2].val) + ').'); }
          if (po !== null) { po -= dt; if (po <= 0) { phys += 50; po = null; note('50 units arrived at the warehouse.'); } }
          if (phys === 0) stats.out += dt;
          renderT -= dt;
          if (renderT <= 0) { renderT = 0.2; render(); }
        },
        redraw: render,
      };
    },
  });
})();
