// Admin – persistence, in the look of the old "נתוני התמדה" popup: the period and
// which children (or one child from the users page: ?user=id); tiles with
// coloured icons and the podium of the most persistent; pink bars whose tooltip
// shows who played then; every child with a pink persistence bar.
(function () {
  const { Users, UI } = window.Admin;
  const { activityOf, PERIODS } = window.ChildStats;
  const users = Users.all();
  const one = new URLSearchParams(location.search).get('user');
  const oneUser = users.find((u) => u.id === one);
  let who = oneUser ? 'one' : 'all';
  let period = 'week';

  const whoBox = document.getElementById('s-who');
  const periodBox = document.getElementById('s-period');
  const WHO = [['all', 'כל הילדים'], ['active', 'פעילים'], ['inactive', 'לא פעילים']];
  if (oneUser) WHO.push(['one', `${oneUser.first} ${oneUser.last}`]);
  whoBox.innerHTML = UI.segHtml('ילדים', WHO, who);
  periodBox.innerHTML = UI.segHtml('תקופה', Object.entries(PERIODS).map(([k, [name]]) => [k, name]), period);
  UI.wireSeg(whoBox, (k) => {
    who = k;
    if (k !== 'one' && one) history.replaceState(null, '', location.pathname);
    render();
  });
  UI.wireSeg(periodBox, (k) => { period = k; render(); });

  const DAYS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const ICON = {
    coins: '<img src="assets/coin.webp" alt="">',
    persist: '<svg viewBox="0 0 24 24"><path d="M3 17l5-5 4 3 8-8"/><path d="M15 7h5v5"/></svg>',
    kids: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/></svg>',
    reviews: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/></svg>',
  };
  let kidsNow = [];
  let barsNow = [];

  // each child's colour in the chart (navy, pink, yellow, then more)
  const KID_COLORS = ['#2A2577', '#E33563', '#EEB741', '#2F7CF2', '#4C8A1E', '#8E4FE0', '#0E7468', '#D9661F'];
  const colorOf = (k) => KID_COLORS[k % KID_COLORS.length];

  // the bars, oldest first: { label, long, days (days-ago indexes), parts: minutes per child, v: total minutes }
  function series(kids) {
    const acts = kids.map(({ u }) => activityOf(u));
    const minutesOn = (days) => acts.map((a) => days.reduce((s, d) => s + ((a[d] && a[d].min) || 0), 0));
    const today = new Date();
    const mk = (label, long, days) => { const parts = minutesOn(days); return { label, long, days, parts, v: parts.reduce((s, x) => s + x, 0) }; };
    if (period === 'year') {
      return Array.from({ length: 12 }, (_, k) => {
        const m = 11 - k; // months ago
        const month = MONTHS_HE[(today.getMonth() - m + 12) % 12];
        return mk(month.slice(0, 3), month, Array.from({ length: 30 }, (_, j) => m * 30 + j));
      });
    }
    const n = PERIODS[period][1];
    return Array.from({ length: n }, (_, k) => {
      const d = n - 1 - k; // days ago
      const date = new Date(today.getTime() - d * 86400000);
      const label = period === 'week' ? DAYS_HE[date.getDay()] : String(date.getDate());
      const long = period === 'week' ? `יום ${DAYS_HE[date.getDay()]}` : date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
      return mk(label, long, [d]);
    });
  }

  // a nice whole step for the minutes axis
  const niceMax = (v) => { const m = Math.max(10, v); const p = 10 ** Math.floor(Math.log10(m)); const f = m / p; return (f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };

  function chart(data) {
    const box = document.getElementById('s-chart');
    const max = niceMax(Math.max(0, ...data.map((b) => b.v)));
    const W = Math.max(box.clientWidth || 600, data.length * 30);
    const H = Math.max(220, box.clientHeight || 260), top = 16, bottom = 34, axis = 70;
    const plotW = W - axis;
    const step = plotW / data.length;
    const bw = Math.min(58, step * 0.56);
    const y = (v) => H - bottom - (v / max) * (H - top - bottom);
    const ticks = [0, max / 2, max];
    const grid = ticks.map((t) => `<line x1="0" x2="${plotW}" y1="${y(t)}" y2="${y(t)}" stroke="#E6E4F2" ${t ? 'stroke-dasharray="4 4"' : ''}/>
      ${t ? `<text x="${W - 4}" y="${y(t) + 4}" text-anchor="start" font-size="13" font-weight="600" fill="#5B5780">${t} דק׳</text>` : ''}`).join('');
    // RTL: the most recent on the left; each bar stacked by child, the first child at the bottom
    const bars = data.map((b, k) => {
      const x = plotW - step * (k + 0.5);
      let acc = 0;
      const segs = b.parts.map((m, j) => {
        if (!m) return '';
        const y0 = y(acc), y1 = y(acc + m);
        acc += m;
        return `<rect class="st-seg" x="${x - bw / 2}" y="${y1}" width="${bw}" height="${Math.max(1, y0 - y1)}" fill="${colorOf(j)}"/>`;
      }).join('');
      return `<g class="st-bar" data-k="${k}" tabindex="0" role="img" aria-label="${b.long}: ${b.v} דקות">
        <rect x="${x - step / 2}" y="${top}" width="${step}" height="${H - top - bottom}" fill="transparent"/>
        ${b.v ? `<g class="st-bar__fill">${segs}</g>` : `<rect x="${x - bw / 2}" y="${H - bottom - 3}" width="${bw}" height="3" rx="1.5" fill="#E6E4F2"/>`}
        <text x="${x}" y="${H - 10}" text-anchor="middle" font-size="13" fill="#5B5780">${b.label}</text>
      </g>`;
    }).join('');
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${grid}${bars}</svg>`;
  }

  // the three most persistent on a podium: 2nd, 1st (with the trophy), 3rd
  function podium(top) {
    const step = (r, place) => (r ? `<div class="st-pod__place st-pod__place--${place}">
        <span class="st-pod__who">${Users.avatar(r.u, r.i)}<small>${r.pct}%</small>${place === 1 ? '<img class="st-pod__cup" src="assets/trophy.svg" alt="">' : ''}</span>
        <span class="st-pod__step"><b>${place}</b><span>${UI.esc(r.u.first)}</span></span>
      </div>` : '<div class="st-pod__place"></div>');
    return `<h2 class="st-col__title">המתמידים ביותר</h2><div class="st-pod__row">${step(top[1], 2)}${step(top[0], 1)}${step(top[2], 3)}</div>`;
  }

  function render() {
    const n = PERIODS[period][1];
    const kids = users.map((u, i) => ({ u, i }))
      .filter(({ u }) => who === 'all' || (who === 'active' && u.active) || (who === 'inactive' && !u.active) || (who === 'one' && u.id === one));
    kidsNow = kids;
    const rowsData = kids.map(({ u, i }) => {
      const part = activityOf(u).slice(0, n);
      const played = part.filter((d) => d.min).length;
      return { u, i, played, pct: Math.round((played / n) * 100), coins: part.reduce((s, d) => s + d.coins, 0), reviews: part.reduce((s, d) => s + d.rev, 0) };
    }).sort((a, b) => b.pct - a.pct || b.coins - a.coins);
    const coins = rowsData.reduce((s, r) => s + r.coins, 0);
    const reviews = rowsData.reduce((s, r) => s + r.reviews, 0);
    const avg = rowsData.length ? Math.round(rowsData.reduce((s, r) => s + r.pct, 0) / rowsData.length) : 0;
    const playing = rowsData.filter((r) => r.played).length;
    const pname = PERIODS[period][0];
    const tile = (kind, label, value, sub) => `<div class="st-tile"><span class="st-tile__icon st-tile__icon--${kind}" aria-hidden="true">${ICON[kind]}</span>
        <div><p class="st-tile__label">${label}</p><p class="st-tile__value">${value}</p><p class="st-tile__sub">${sub}</p></div></div>`;
    document.getElementById('s-tiles').innerHTML =
      tile('coins', 'מטבעות שנצברו', coins.toLocaleString('he-IL'), `${who === 'one' ? 'הילד/ה' : 'כל הילדים'} · ${pname}`) +
      tile('persist', 'התמדה ממוצעת', `${avg}%`, 'מהימים בתקופה') +
      tile('kids', 'ילדים ששיחקו', playing, `מתוך ${rowsData.length}`) +
      tile('reviews', 'חזרות', reviews, who === 'one' ? 'הילד/ה' : 'כל הילדים');
    document.getElementById('s-podium').innerHTML = podium(rowsData.slice(0, 3));

    barsNow = series(kids);
    document.getElementById('s-chart-title').textContent = period === 'year' ? 'כמה דקות שיחקו בכל חודש' : 'כמה דקות שיחקו בכל יום';
    document.getElementById('s-chart').innerHTML = chart(barsNow);

    document.getElementById('s-rank').innerHTML = rowsData.map((r) => `<li>
        <span class="a-user">${Users.avatar(r.u, r.i)}<b>${UI.esc(`${r.u.first} ${r.u.last}`)}</b></span>
        <span class="st-bar-line"><i style="width:${r.pct}%"></i></span>
        <b class="st-pct">${r.pct}%</b>
        <span class="st-meta">${r.played} ימים · <img src="assets/coin.webp" alt="מטבעות">${r.coins}</span>
      </li>`).join('') || '<li class="a-muted" style="display:block">אין ילדים בסינון הזה</li>';
  }

  /* the chart's tooltip: who played on that day (minutes), or in that month (days) */
  const tip = document.createElement('div');
  tip.className = 'st-tip';
  tip.hidden = true;
  document.body.appendChild(tip);
  function showTip(g, x, y) {
    const b = barsNow[Number(g.dataset.k)];
    if (!b) return;
    // each child's minutes then, with the child's colour from the bar
    const list = kidsNow.map(({ u, i }, j) => ({ u, i, v: b.parts[j] || 0, c: colorOf(j) }))
      .filter((r) => r.v).sort((p, q) => q.v - p.v);
    const count = list.length;
    tip.innerHTML = `<b class="st-tip__title">${b.long} · ${count} ${count === 1 ? 'ילד/ה שיחק/ה' : 'ילדים שיחקו'} · ${b.v} דק׳</b>
      ${count ? list.map((r) => `<span class="st-tip__row"><i class="st-tip__dot" style="background:${r.c}"></i>${Users.avatar(r.u, r.i)}<span>${UI.esc(`${r.u.first} ${r.u.last}`)}</span><b>${r.v} דק׳</b></span>`).join('') : '<span class="a-muted">אף אחד לא שיחק</span>'}`;
    tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let left = x - w / 2, top = y - h - 16;
    left = Math.max(8, Math.min(innerWidth - w - 8, left));
    if (top < 8) top = y + 20;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }
  const chartBox = document.getElementById('s-chart');
  chartBox.addEventListener('mousemove', (e) => {
    const g = e.target.closest('.st-bar');
    chartBox.querySelectorAll('.st-bar.is-hot').forEach((x) => { if (x !== g) x.classList.remove('is-hot'); });
    if (!g) { tip.hidden = true; return; }
    g.classList.add('is-hot');
    showTip(g, e.clientX, e.clientY);
  });
  chartBox.addEventListener('mouseleave', () => { tip.hidden = true; chartBox.querySelectorAll('.is-hot').forEach((x) => x.classList.remove('is-hot')); });
  chartBox.addEventListener('focusin', (e) => {
    const g = e.target.closest('.st-bar');
    if (!g) return;
    const r = g.getBoundingClientRect();
    showTip(g, r.left + r.width / 2, r.top + 20);
  });
  chartBox.addEventListener('focusout', () => { tip.hidden = true; });

  render();
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(render, 150); });
})();
