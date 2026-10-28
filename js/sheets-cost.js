/* Supply Chain Workbook - sheets 4 to 6: holding cost and EOQ, doing the right things, and About. */
(function () {
  'use strict';
  const { h, fit, kpi, fmt, money, css, roundRect } = SCW;

  // ======================================================================
  // 4. HOLDING COST AND EOQ
  // ======================================================================
  SCW.register({
    id: 'holding', tab: 'Holding cost', accent: '--c-green', name: 'EOQ',
    formula: '= SQRT(2 × D × S ÷ H)    Total = D ÷ Q × S + Q ÷ 2 × H',
    title: 'Holding inventory costs money',
    lead: 'Every unit sitting on a shelf costs you something every day it sits there.',
    explain: {
      see: 'The top chart is your stock over one year: you order Q units, sell them down, and order again. The bottom chart adds up the yearly cost of ordering and the yearly cost of holding stock.',
      try: 'Drag Order size up. Fewer orders, but the shelf holds more, so holding cost climbs. Drag it down and ordering cost explodes. Then press Use the EOQ to find the cheapest balance.',
      why: 'Holding cost covers money tied up in stock, warehouse space, insurance, damage and products going out of date. The economic order quantity (EOQ) is the order size where total cost is lowest.',
    },
    mount(p) {
      const v = { D: 6000, S: 80, C: 40, r: 25, Q: 1500 };
      let t = 0;
      const saw = h('canvas', { class: 'sim-canvas short', role: 'img', 'aria-label': 'Inventory level over one year' });
      const curve = h('canvas', { class: 'sim-canvas short', role: 'img', 'aria-label': 'Yearly ordering, holding and total cost for each order size' });
      p.stage.append(h('p', { class: 'chart-title', text: 'Stock on hand over one year' }), saw,
        h('p', { class: 'chart-title', text: 'Yearly cost by order size' }), curve);
      const sliders = {};
      const add = (key, label, min, max, step, f) => {
        sliders[key] = SCW.slider(label, min, max, step, v[key], (x) => { v[key] = x; update(); }, f);
        p.controls.append(sliders[key].el);
      };
      add('Q', 'Order size (Q)', 50, 4000, 25, (x) => fmt(x) + ' units');
      add('D', 'Yearly demand (D)', 1000, 20000, 500, (x) => fmt(x) + ' units');
      add('S', 'Cost per order (S)', 10, 300, 10, (x) => money(x));
      add('C', 'Unit cost', 5, 200, 5, (x) => money(x));
      add('r', 'Holding rate per year', 10, 40, 1, (x) => x + '%');
      p.controls.append(SCW.button('Use the EOQ', () => { v.Q = Math.round(eoq() / 25) * 25; sliders.Q.set(v.Q); update(); }, 'btn-go'));

      const kTot = kpi('Total yearly cost', 'ordering + holding');
      const kH = kpi('Holding cost', 'Q ÷ 2 × H');
      const kO = kpi('Ordering cost', 'D ÷ Q × S');
      const kE = kpi('Best order size (EOQ)', '');
      p.kpis.append(kTot.el, kH.el, kO.el, kE.el);
      const parts = [['Money tied up', 50, '--c-blue'], ['Storage space', 25, '--c-green'], ['Insurance and taxes', 10, '--c-purple'], ['Damage and obsolescence', 15, '--c-orange']];
      const bar = h('div', { class: 'stack', role: 'img', 'aria-label': 'What makes up holding cost' });
      const legend = h('ul', { class: 'legend' });
      for (const [n, pct, c] of parts) {
        bar.append(h('span', { style: 'width:' + pct + '%; background: var(' + c + ')' }));
        legend.append(h('li', { style: '--sw: var(' + c + ')', text: n + ' (' + pct + '%)' }));
      }
      const perUnit = h('p', { class: 'note' });
      p.extra.append(h('p', { class: 'chart-title', text: 'What holding cost is made of' }), bar, legend, perUnit);

      const H = () => (v.C * v.r) / 100;
      const eoq = () => Math.sqrt((2 * v.D * v.S) / H());
      const cost = (q) => ({ order: (v.D / q) * v.S, hold: (q / 2) * H() });

      function drawSaw() {
        const { ctx, w, h: Hh } = fit(saw);
        const l = 40, r = 10, top = 10, b = 20, W = w - l - r, HH = Hh - top - b;
        const ymax = Math.max(500, Math.ceil((v.Q * 1.25) / 100) * 100), cycles = v.D / v.Q;
        const X = (f) => l + f * W, Y = (u) => top + HH - (u / ymax) * HH;
        axes(ctx, l, top, W, HH, ymax, (u) => fmt(u));
        ctx.strokeStyle = css('--c-green');
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (cycles > 80) {
          ctx.moveTo(X(0), Y(v.Q / 2)); ctx.lineTo(X(1), Y(v.Q / 2));
        } else {
          for (let k = 0; k < cycles; k++) {
            const a = k / cycles, bb = Math.min(1, (k + 1) / cycles);
            ctx.moveTo(X(a), Y(v.Q));
            ctx.lineTo(X(bb), Y(v.Q * (1 - (bb - a) * cycles)));
          }
        }
        ctx.stroke();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = css('--ink-soft');
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(X(0), Y(v.Q / 2)); ctx.lineTo(X(1), Y(v.Q / 2)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = css('--ink-soft');
        ctx.textAlign = 'right';
        ctx.fillText('Average: ' + fmt(v.Q / 2), X(1), Y(v.Q / 2) - 9);
        const f = (t / 8) % 1, level = v.Q * (1 - ((f * cycles) % 1));
        ctx.fillStyle = css('--c-green');
        ctx.beginPath(); ctx.arc(X(f), Y(cycles > 80 ? v.Q / 2 : level), 5, 0, Math.PI * 2); ctx.fill();
      }

      function drawCurve() {
        const { ctx, w, h: Hh } = fit(curve);
        const l = 52, r = 10, top = 10, b = 20, W = w - l - r, HH = Hh - top - b;
        const best = cost(eoq()), bestTotal = best.order + best.hold;
        const qmax = Math.min(4000, Math.max(600, Math.ceil(Math.max(eoq() * 3, v.Q * 1.3) / 100) * 100));
        const qmin = Math.max(25, qmax * 0.04);
        const ymax = Math.ceil((bestTotal * 3) / 500) * 500;
        const X = (q) => l + ((q - qmin) / (qmax - qmin)) * W, Y = (c) => top + HH - (c / ymax) * HH;
        axes(ctx, l, top, W, HH, ymax, (c) => money(c));
        ctx.save();
        ctx.beginPath(); ctx.rect(l, top - 2, W, HH + 4); ctx.clip();
        const line = (fn, col, lw) => {
          ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
          const stepQ = (qmax - qmin) / 120;
          for (let q = qmin; q <= qmax + 0.1; q += stepQ) { const y = Y(fn(q)); if (q === qmin) ctx.moveTo(X(q), y); else ctx.lineTo(X(q), y); }
          ctx.stroke();
        };
        line((q) => cost(q).order, css('--c-blue'), 2);
        line((q) => cost(q).hold, css('--c-orange'), 2);
        line((q) => cost(q).order + cost(q).hold, css('--ink'), 3);
        ctx.restore();
        const mark = (q, col, label, dy) => {
          ctx.strokeStyle = col; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(X(q), top); ctx.lineTo(X(q), top + HH); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = col; ctx.textAlign = X(q) > w - 90 ? 'right' : 'left';
          ctx.fillText(label, X(q) + (X(q) > w - 90 ? -6 : 6), top + 12 + (dy || 0));
        };
        mark(Math.min(qmax, eoq()), css('--c-green'), 'EOQ');
        mark(Math.min(qmax, v.Q), css('--c-purple'), 'Your Q', 18);
        ctx.textAlign = 'left';
        ctx.fillStyle = css('--c-blue'); ctx.fillText('Ordering', l + 6, top + HH - 12);
        ctx.fillStyle = css('--c-orange'); ctx.textAlign = 'right'; ctx.fillText('Holding', l + W - 4, Math.max(top + 24, Y(cost(qmax).hold) + 14));
        ctx.fillStyle = css('--ink'); ctx.textAlign = 'left'; ctx.fillText('Total', X(eoq()) + 6, Math.max(top + 30, Y(bestTotal) - 12));
      }

      function axes(ctx, l, top, W, HH, ymax, label) {
        ctx.font = '500 11px Figtree, system-ui, sans-serif';
        ctx.strokeStyle = css('--grid'); ctx.fillStyle = css('--ink-soft'); ctx.lineWidth = 1;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let g = 0; g <= 4; g++) {
          const y = top + HH - (g / 4) * HH;
          ctx.beginPath(); ctx.moveTo(l, y); ctx.lineTo(l + W, y); ctx.stroke();
          ctx.fillText(label((ymax / 4) * g), l - 6, y);
        }
      }

      function update() {
        const c = cost(v.Q), e = eoq(), ce = cost(e), extra = c.order + c.hold - (ce.order + ce.hold);
        kTot.set(money(c.order + c.hold), extra < 50 ? 'good' : 'bad', extra < 50 ? 'at the lowest cost' : money(extra) + ' more than the EOQ');
        kH.set(money(c.hold), c.hold > c.order * 1.3 ? 'bad' : '');
        kO.set(money(c.order), c.order > c.hold * 1.3 ? 'bad' : '');
        kE.set(fmt(e) + ' units', 'good', 'costs ' + money(ce.order + ce.hold) + ' a year');
        perUnit.textContent = 'Each unit on the shelf costs ' + money(H()) + ' a year to hold (' + v.r + '% of ' + money(v.C) + ').';
        drawSaw(); drawCurve();
      }
      update();
      return {
        tick(dt) { t += dt; drawSaw(); },
        redraw: update,
      };
    },
  });

  // ======================================================================
  // 5. DOING THINGS RIGHT VS DOING THE RIGHT THINGS
  // ======================================================================
  SCW.register({
    id: 'rightthings', tab: 'Right things', accent: '--c-magenta', name: 'RESULT',
    formula: '= AND(Right_thing, Done_right)',
    title: 'Doing things right vs doing the right things',
    lead: 'A perfectly efficient machine making the wrong product is still a waste.',
    explain: {
      see: 'The machine runs flat out making blue items because the plan said so. Most customers want orange. Unsold blue stock piles up and costs money to hold, while orange orders walk away.',
      try: 'Turn on Make what customers order. Utilization drops, because the machine waits for real orders, yet orders filled jumps. Then slow the machine down and see why both halves of the truth table matter.',
      why: 'Efficiency is doing things right. Effectiveness is doing the right things. Chasing a busy machine or a high utilization score can hide the real goal: giving customers what they need.',
    },
    mount(p) {
      let speed = 95, pull = false, t = 0;
      let made, belt, stock, backlog, filled, lost, held, busy, flashes, nextCust, kpiT = 0;
      const reset = () => {
        made = 0; belt = []; stock = { A: 0, B: 0 }; backlog = []; filled = 0; lost = 0; held = 0; busy = 1; flashes = []; nextCust = 0.5;
      };
      reset();
      const canvas = h('canvas', { class: 'sim-canvas', role: 'img', 'aria-label': 'A machine making items, a warehouse and customers asking for blue or orange items' });
      p.stage.append(canvas);
      p.controls.append(
        SCW.toggle('Make what customers order', (on) => { pull = on; reset(); }),
        SCW.slider('Machine speed', 40, 100, 5, speed, (x) => { speed = x; }, (x) => x + '%').el,
        SCW.button('Start over', reset));

      const kU = kpi('Machine utilization', 'doing things right');
      const kF = kpi('Orders filled', 'doing the right things');
      const kS = kpi('Unsold stock', 'items nobody ordered');
      const kH = kpi('Holding cost so far', '$2 per item per second');
      p.kpis.append(kU.el, kF.el, kS.el, kH.el);

      const rows = [
        [false, true, 'Very efficiently making what nobody wants'],
        [true, false, 'The right product, but slow and costly'],
        [true, true, 'Effective and efficient: the goal'],
        [false, false, 'The wrong product, made slowly'],
      ];
      const tbody = h('tbody');
      const rowEls = rows.map(([right, done, out]) => {
        const tr = h('tr', null, h('td', { text: right ? 'Yes' : 'No' }), h('td', { text: done ? 'Yes' : 'No' }), h('td', { text: out }));
        tbody.append(tr);
        return tr;
      });
      p.extra.append(
        h('table', { class: 'truth' },
          h('caption', { text: 'Truth table: which row are you in?' }),
          h('thead', null, h('tr', null, h('th', { scope: 'col', text: 'Right thing?' }), h('th', { scope: 'col', text: 'Done right?' }), h('th', { scope: 'col', text: 'Result' }))),
          tbody),
        h('blockquote', { class: 'quote' },
          h('p', { text: '“There is nothing so useless as doing efficiently that which should not be done at all.”' }),
          h('cite', { text: 'Peter Drucker' })));

      const want = () => (Math.random() < 0.8 ? 'B' : 'A');
      function step(dt) {
        t += dt;
        const rate = 2 * (speed / 100);
        nextCust -= dt;
        if (nextCust <= 0) {
          nextCust = 0.75;
          const c = want();
          if (pull) { backlog.push(c); if (backlog.length > 10) { backlog.shift(); lost++; flashes.push({ ok: false, c, t }); } }
          else if (stock[c] > 0) { stock[c]--; filled++; flashes.push({ ok: true, c, t }); }
          else { lost++; flashes.push({ ok: false, c, t }); }
        }
        const working = !pull || backlog.length > belt.length;
        busy += ((working ? 1 : 0) - busy) * (1 - Math.exp(-dt / 3));
        if (working) {
          made += rate * dt;
          while (made >= 1) { made -= 1; belt.push({ c: pull ? backlog[belt.length] || 'B' : 'A', x: 0 }); }
        }
        for (const it of belt) it.x += dt * 0.6;
        while (belt.length && belt[0].x >= 1) {
          const it = belt.shift();
          if (pull && backlog.length) { backlog.shift(); filled++; flashes.push({ ok: true, c: it.c, t }); }
          else stock[it.c]++;
        }
        held += (stock.A + stock.B) * 2 * dt;
        flashes = flashes.filter((f) => t - f.t < 1.2);
      }

      function draw() {
        const { ctx, w, h: H } = fit(canvas);
        const ink = css('--ink'), soft = css('--ink-soft'), A = css('--c-blue'), B = css('--c-orange'), card = css('--sheet');
        const col = (c) => (c === 'A' ? A : B);
        ctx.font = FONT13; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
        const my = H * 0.45, mx = 16, mw = Math.min(110, w * 0.2), beltX0 = mx + mw, beltX1 = w * 0.62;
        roundRect(ctx, mx, my - 40, mw, 80, 10); ctx.fillStyle = card; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = css('--c-magenta'); ctx.stroke();
        ctx.fillStyle = ink; ctx.fillText('Machine', mx + mw / 2, my - 14); ctx.fillText(speed + '% speed', mx + mw / 2, my + 8);
        ctx.fillStyle = soft; ctx.fillText(pull ? 'Making orders' : 'Making blue', mx + mw / 2, my + 56);
        ctx.strokeStyle = soft; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 30;
        ctx.beginPath(); ctx.moveTo(beltX0, my + 22); ctx.lineTo(beltX1, my + 22); ctx.stroke(); ctx.setLineDash([]);
        for (const it of belt) { ctx.fillStyle = col(it.c); ctx.fillRect(beltX0 + it.x * (beltX1 - beltX0) - 7, my + 6, 14, 14); }
        const wx = beltX1 + 8, ww = w * 0.2;
        ctx.fillStyle = ink; ctx.fillText('Warehouse', wx + ww / 2, 18);
        ['A', 'B'].forEach((c, k) => {
          const n = Math.min(stock[c], 60), cols = 6, x0 = wx + k * (ww / 2);
          ctx.fillStyle = col(c);
          for (let i = 0; i < n; i++) ctx.fillRect(x0 + (i % cols) * 8, H - 26 - Math.floor(i / cols) * 8, 6, 6);
          ctx.fillStyle = soft; ctx.fillText(String(stock[c]), x0 + 24, H - 10);
        });
        const cx = w - 36;
        ctx.fillStyle = ink; ctx.fillText('Customers', cx, 18);
        const shown = flashes.slice(-6);
        shown.forEach((f, i) => {
          const y = 44 + i * 30;
          ctx.fillStyle = col(f.c); ctx.beginPath(); ctx.arc(cx - 10, y, 9, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = f.ok ? css('--c-green') : css('--bad');
          ctx.fillText(f.ok ? '✓' : '✗', cx + 14, y);
        });
        if (pull) { ctx.fillStyle = soft; ctx.fillText('Waiting orders: ' + backlog.length, cx - 20, H - 10); }
      }

      return {
        tick(dt) {
          step(dt);
          draw();
          kpiT -= dt;
          if (kpiT > 0) return;
          kpiT = 0.25;
          const total = filled + lost, pct = total ? (filled / total) * 100 : 0;
          const util = busy * speed;
          kU.set(Math.round(util) + '%', util >= 80 ? 'good' : '');
          kF.set(total ? Math.round(pct) + '%' : '–', pct >= 80 ? 'good' : 'bad');
          kS.set(fmt(stock.A + stock.B), stock.A + stock.B > 10 ? 'bad' : 'good');
          kH.set(money(held), held > 200 ? 'bad' : '');
          const right = pull, doneRight = speed >= 80;
          rowEls.forEach((tr, i) => tr.classList.toggle('is-current', rows[i][0] === right && rows[i][1] === doneRight));
        },
        redraw: draw,
      };
    },
  });
  const FONT13 = '600 13px Figtree, system-ui, sans-serif';

  // ======================================================================
  // 6. ABOUT
  // ======================================================================
  SCW.register({
    id: 'about', tab: 'About', accent: '--c-teal', name: 'AUTHOR',
    formula: '= "Built by " & MARK_FOURMANOVSKIS',
    title: 'About this workbook',
    lead: 'Supply chain ideas you can see, test and question.',
    mount(p) {
      const skills = ['Inventory management', 'Freight forwarding', 'Excel (Power Query, VBA)', 'Power BI', 'Tableau', 'SAP S/4HANA', 'Microsoft Access'];
      const panes = h('div', { class: 'panes' },
        h('div', { class: 'card about' },
          h('h3', { text: 'Who built this' }),
          h('p', { text: 'I’m Mark Fourmanovskis. I taught high school math and science, and now I’m studying Supply Chain Management (Global Logistics) at Seneca College. I like turning tricky ideas into something people can see, test and question.' }),
          h('p', { text: 'Each sheet in this workbook is one supply chain idea, shown the way I’d teach it: a picture that moves, numbers that react, and a plain-language explanation.' }),
          h('h3', { text: 'Skills' }),
          h('ul', { class: 'chips' }, skills.map((s) => h('li', { text: s }))),
          h('h3', { text: 'More' }),
          h('p', null,
            h('a', { href: 'https://markfourman.github.io/cargo-voyage/', text: 'Cargo Voyage' }),
            ' follows one shipment into Canada by sea or air. ',
            h('a', { href: 'https://www.linkedin.com/in/mark-fourmanovskis', text: 'Connect with me on LinkedIn' }), '.')),
        h('div', { class: 'card about' },
          h('h3', { text: 'How it’s built' }),
          h('ul', { class: 'plain' },
            h('li', { text: 'Plain HTML, CSS and JavaScript. No frameworks, nothing to install.' }),
            h('li', { text: 'Every number is calculated live in your browser, like a spreadsheet recalculating.' }),
            h('li', { text: 'Works with a keyboard and screen reader, in light or dark mode, on a phone or a big screen.' }),
            h('li', { text: 'The skill-testing question is a nod to Canadian contests, and to order of operations.' }))));
      p.section.querySelector('.panes').replaceWith(panes);
      return {};
    },
  });
})();
