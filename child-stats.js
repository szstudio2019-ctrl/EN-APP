// A child's play data (demo) and how it is shown – shared by the admin page
// (every child) and the profile page (the learner's own): a year of play made
// up from the username, the persistence chart and the stat tiles.
(function () {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  /* ---------- Each child's data (demo): a year of play, made up from the
     username so it stays the same on every visit ---------- */
  const seeded = (s) => {
    let h = 2166136261;
    for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  };
  const activity = {};
  function activityOf(u) {
    if (activity[u.id]) return activity[u.id];
    const rnd = seeded(u.user || u.id);
    const keen = 0.35 + rnd() * 0.5; // how often this child plays
    const since = Math.max(0, Math.floor((now - new Date(u.start)) / DAY));
    const stopped = u.active ? 0 : 20 + Math.floor(rnd() * 40); // inactive: no play lately
    // days[0] = today, days[1] = yesterday, … : minutes played and coins earned
    const days = Array.from({ length: 365 }, (_, d) => {
      const played = d <= since && d >= stopped && rnd() < keen;
      const min = played ? 5 + Math.round(rnd() * 35) : 0;
      return { min, coins: played ? Math.round(min * (1 + rnd())) : 0 };
    });
    const rr = seeded(`${u.user || u.id}:reviews`);
    days.forEach((d) => { d.rev = d.min && rr() < 0.3 ? 1 : 0; });
    activity[u.id] = days;
    return days;
  }
  const PERIODS = { week: ['שבוע', 7], month: ['חודש', 30], year: ['שנה', 365] };
  const DAYS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const MONTHS_HE = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
  const TILE_ICONS = {
    coins: '<img src="assets/coin.webp" alt="">',
    days: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8.5 14.5l2 2 4-4"/></svg>',
    persist: '<svg viewBox="0 0 24 24"><path d="M3 17l5-5 4 3 8-8"/><path d="M15 7h5v5"/></svg>',
    streak: '<svg viewBox="0 0 24 24"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.6 1.2 2.6 2.3 3C11 9 11.5 6 12 3z"/></svg>',
    reviews: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/></svg>',
    kids: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.3c3 0 5.5 2.2 5.5 5.7"/></svg>',
    top: '<img src="assets/trophy.svg" alt="">',
  };
  const tile = (kind, label, value, note) => `<div class="admin-stats__tile admin-stats__tile--${kind}"><div class="admin-stats__text"><span>${label}</span><b>${value}</b>${note ? `<small>${note}</small>` : ''}</div><i class="admin-stats__icon" aria-hidden="true">${TILE_ICONS[kind]}</i></div>`;

  // the persistence chart: one bar per day (week, month) or per month (year)
  // opts (all children): kids = the bars count children, not minutes / days
  function chartOf(days, period, opts = {}) {
    let bars;
    if (period === 'year') {
      bars = Array.from({ length: 12 }, (_, k) => {
        const m = new Date(now); m.setDate(1); m.setMonth(m.getMonth() - (11 - k));
        const from = Math.floor((now - m) / DAY);
        const next = new Date(m); next.setMonth(m.getMonth() + 1);
        const to = Math.max(0, Math.ceil((now - next) / DAY));
        const month = days.slice(to, from + 1);
        if (opts.kids) {
          const avg = Math.round((month.reduce((s, d) => s + d.min, 0) / Math.max(1, month.length)) * 10) / 10;
          return { v: avg, label: MONTHS_HE[m.getMonth()], tip: `${avg} ילדים ביום בממוצע` };
        }
        const n = month.filter((d) => d.min).length;
        return { v: n, label: MONTHS_HE[m.getMonth()], tip: `${n} ימי משחק` };
      });
    } else {
      const n = PERIODS[period][1];
      bars = Array.from({ length: n }, (_, k) => {
        const d = n - 1 - k;
        const date = new Date(now - d * DAY);
        const label = period === 'week' ? DAYS_HE[date.getDay()] : (k % 5 === 4 || d === 0 ? String(date.getDate()) : '');
        const tip = opts.kids ? `${days[d].min} ילדים שיחקו` : days[d].min ? `${days[d].min} דקות` : 'לא שיחק';
        return { v: days[d].min, label, tip };
      });
    }
    const W = 1400, H = 220, top = 24, base = H - 30; // wide, so the chart stays low in the panel
    const max = opts.kids ? Math.max(1, opts.kids) : Math.max(...bars.map((b) => b.v), period === 'year' ? 10 : 20);
    const step = W / bars.length;
    const bw = Math.min(56, step * 0.62);
    const unit = opts.kids ? 'ילדים' : period === 'year' ? 'ימים' : 'דקות';
    const grid = [0.5, 1].map((f) => { const y = base - (base - top) * f; return `<line x1="0" x2="${W}" y1="${y}" y2="${y}" class="admin-chart__grid"/><text x="${W}" y="${y - 6}" class="admin-chart__axis" text-anchor="end">${Math.round(max * f * 10) / 10} ${unit}</text>`; }).join('');
    const marks = bars.map((b, k) => {
      const x = k * step + (step - bw) / 2;
      const h = b.v ? Math.max(4, ((base - top) * b.v) / max) : 3;
      return `<g><title>${b.label || ''} ${b.tip}</title><rect x="${x.toFixed(1)}" y="${(base - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(6, bw / 3).toFixed(1)}" class="${b.v ? 'admin-chart__bar' : 'admin-chart__none'}"/>${b.label ? `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 8}" class="admin-chart__axis" text-anchor="middle">${b.label}</text>` : ''}</g>`;
    }).join('');
    return `<svg class="admin-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="גרף התמדה – ${PERIODS[period][0]}">${grid}<line x1="0" x2="${W}" y1="${base}" y2="${base}" class="admin-chart__base"/>${marks}</svg>`;
  }

  function statsOf(u, period) {
    const days = activityOf(u);
    const n = PERIODS[period][1];
    const part = days.slice(0, n);
    const played = part.filter((d) => d.min).length;
    const coins = part.reduce((s, d) => s + d.coins, 0);
    const reviews = part.reduce((s, d) => s + d.rev, 0);
    let best = 0, run = 0;
    part.forEach((d) => { run = d.min ? run + 1 : 0; best = Math.max(best, run); });
    const pct = Math.round((played / n) * 100);
    return `
      <div class="admin-stats">
        <div class="admin-stats__head">
          <b class="admin-stats__title">הנתונים של ${u.first}</b>
          <div class="admin-stats__periods" role="tablist" aria-label="תקופה">
            ${Object.entries(PERIODS).map(([k, [name]]) => `<button type="button" role="tab" class="admin__chip${k === period ? ' is-on' : ''}" data-period="${k}" data-id="${u.id}" aria-selected="${k === period}">${name}</button>`).join('')}
          </div>
        </div>
        <div class="admin-stats__tiles">
          ${tile('coins', 'מטבעות שנצברו', coins, 'מטבעות')}
          ${tile('days', 'ימי משחק', played, `מתוך ${n} ימים`)}
          ${tile('persist', 'התמדה', `${pct}%`, 'מהימים בתקופה')}
          ${tile('streak', 'הרצף הארוך', best, 'ימים ברצף')}
          ${tile('reviews', 'חזרות שעשה/תה', reviews, 'חזרות בתקופה')}
        </div>
        <p class="admin-stats__chart-title">גרף התמדה · ${period === 'year' ? 'ימי משחק בכל חודש' : 'דקות משחק בכל יום'}</p>
        ${chartOf(days, period)}
      </div>`;
  }
  window.ChildStats = { activityOf, chartOf, statsOf, tile, PERIODS };
})();
