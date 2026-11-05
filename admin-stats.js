// Admin – persistence: which children (all / active / inactive, or one child from
// the users page: ?user=id) and the period; four tiles, the "how many children
// played each day" chart, and every child ranked by persistence.
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
  const MONTHS_HE = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];

  // the bars, oldest first: [label, value]
  function series(kids) {
    const acts = kids.map(({ u }) => activityOf(u));
    const playedOn = (d) => acts.filter((a) => a[d] && a[d].min).length;
    const today = new Date();
    if (period === 'year') {
      return Array.from({ length: 12 }, (_, k) => {
        const m = 11 - k; // months ago
        const days = Array.from({ length: 30 }, (_, j) => m * 30 + j);
        const avg = days.reduce((s, d) => s + playedOn(d), 0) / days.length;
        const month = (today.getMonth() - m + 12) % 12;
        return [MONTHS_HE[month], Math.round(avg)];
      });
    }
    const n = PERIODS[period][1];
    return Array.from({ length: n }, (_, k) => {
      const d = n - 1 - k; // days ago
      const date = new Date(today.getTime() - d * 86400000);
      const label = period === 'week' ? DAYS_HE[date.getDay()] : String(date.getDate());
      return [label, playedOn(d)];
    });
  }

  function chart(data, max) {
    const box = document.getElementById('s-chart');
    const W = Math.max(box.clientWidth || 600, data.length * 30);
    const H = 260, top = 26, bottom = 30, side = 8;
    const step = (W - side * 2) / data.length;
    const bw = Math.min(36, step * 0.62);
    const scale = (v) => (max ? (v / max) * (H - top - bottom) : 0);
    // a few whole-number grid lines
    const ticks = [...new Set([0, Math.round(max / 2), max])];
    const grid = ticks.map((t) => {
      const y = H - bottom - scale(t);
      return `<line x1="${side}" x2="${W - side}" y1="${y}" y2="${y}" stroke="#E6E4F2"/>`;
    }).join('');
    // RTL: the most recent day on the left, like reading the timeline right to left
    const bars = data.map(([label, v], k) => {
      const x = W - side - step * (k + 0.5);
      const h = scale(v);
      const y = H - bottom - h;
      return `<g>
        <rect x="${x - bw / 2}" y="${y}" width="${bw}" height="${Math.max(h, v ? 2 : 0)}" rx="5" fill="#504192"><title>${label}: ${v}</title></rect>
        <text x="${x}" y="${y - 7}" text-anchor="middle" font-size="13" font-weight="600" fill="#2A2561">${v}</text>
        <text x="${x}" y="${H - 9}" text-anchor="middle" font-size="12" fill="#5B5780">${label}</text>
      </g>`;
    }).join('');
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="כמה ילדים שיחקו: ${data.map(([l, v]) => `${l} ${v}`).join(', ')}">${grid}${bars}</svg>`;
  }

  function render() {
    const n = PERIODS[period][1];
    const kids = users.map((u, i) => ({ u, i }))
      .filter(({ u }) => who === 'all' || (who === 'active' && u.active) || (who === 'inactive' && !u.active) || (who === 'one' && u.id === one));
    const rowsData = kids.map(({ u, i }) => {
      const part = activityOf(u).slice(0, n);
      const played = part.filter((d) => d.min).length;
      return { u, i, played, pct: Math.round((played / n) * 100), coins: part.reduce((s, d) => s + d.coins, 0), reviews: part.reduce((s, d) => s + d.rev, 0) };
    }).sort((a, b) => b.pct - a.pct || b.coins - a.coins);
    const coins = rowsData.reduce((s, r) => s + r.coins, 0);
    const reviews = rowsData.reduce((s, r) => s + r.reviews, 0);
    const avg = rowsData.length ? Math.round(rowsData.reduce((s, r) => s + r.pct, 0) / rowsData.length) : 0;
    const playing = rowsData.filter((r) => r.played).length;
    const tile = (label, value, sub) => `<div class="a-tile"><p class="a-tile__label">${label}</p><p class="a-tile__value">${value}</p><p class="a-tile__sub">${sub}</p></div>`;
    document.getElementById('s-tiles').innerHTML =
      tile('מטבעות שנצברו', coins.toLocaleString('he-IL'), { week: 'בשבוע האחרון', month: 'בחודש האחרון', year: 'בשנה האחרונה' }[period]) +
      tile('התמדה ממוצעת', `${avg}%`, 'מהימים בתקופה') +
      tile('ילדים ששיחקו', playing, `מתוך ${rowsData.length}`) +
      tile('חזרות', reviews, 'שהושלמו בתקופה');

    const data = series(kids);
    const max = Math.max(1, ...data.map(([, v]) => v));
    document.getElementById('s-chart-title').textContent = period === 'year' ? 'כמה ילדים שיחקו · ממוצע ליום בכל חודש' : 'כמה ילדים שיחקו בכל יום';
    document.getElementById('s-chart').innerHTML = chart(data, max);

    document.getElementById('s-rank').innerHTML = rowsData.map((r, k) => `<li>
        <span class="a-rank__n">${k + 1}</span>
        <span class="a-user">${Users.avatar(r.u, r.i)}<span>${UI.esc(`${r.u.first} ${r.u.last}`)}</span></span>
        <span class="a-bar" role="presentation"><i style="width:${r.pct}%"></i></span>
        <span class="a-rank__pct">${r.pct}%</span>
        <span class="a-rank__meta">${r.played} ימים · ${r.coins} מטבעות</span>
      </li>`).join('') || '<li class="a-muted" style="display:block">אין ילדים בסינון הזה</li>';
  }

  render();
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(render, 150); });
})();
