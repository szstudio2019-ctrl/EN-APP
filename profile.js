// Profile page: edit the learner's details (photo, name, username, phone,
// password) and see the coins, treasure chests and sentences collected.
// Demo: everything is kept in this browser (localStorage); menu.js shows the
// saved name and photo in the header and menu of every page.
(function () {
  const W = 1920;
  const H = 1080;
  const stage = document.getElementById('stage');
  function fit() {
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    const x = (window.innerWidth - W * scale) / 2;
    const y = (window.innerHeight - H * scale) / 2;
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    stage.style.setProperty('--edge-shift', `${(-x / scale).toFixed(1)}px`);
    stage.style.setProperty('--edge-shift-y', `${(-y / scale).toFixed(1)}px`);
  }
  window.addEventListener('resize', fit);
  fit();
  document.body.classList.add('is-loading');

  const KEY = 'en-app:profile';
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (err) { return null; } };
  const profile = Object.assign({
    name: document.querySelector('.user__name')?.textContent.trim() || '',
    user: 'shira.cohen',
    phone: '',
    photo: '',
  }, read(KEY) || {});

  /* ---------- Details form ---------- */
  const $ = (id) => document.getElementById(id);
  const photo = $('profile-photo');
  $('p-name').value = profile.name;
  $('p-user').value = profile.user;
  $('p-phone').value = profile.phone;
  if (profile.photo) photo.src = profile.photo;

  // a new photo is shrunk to a small square before it is kept
  $('profile-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const size = 240;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const s = Math.max(size / img.width, size / img.height);
      const w = img.width * s;
      const h = img.height * s;
      c.getContext('2d').drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      photo.src = c.toDataURL('image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });

  const msg = $('profile-msg');
  const say = (text, ok) => { msg.textContent = text; msg.classList.toggle('is-error', !ok); };
  $('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = $('p-pass').value;
    if (pass && pass.length < 6) { say('הסיסמה צריכה להיות לפחות 6 תווים', false); return; }
    if (pass !== $('p-pass2').value) { say('הסיסמאות לא תואמות', false); return; }
    const phone = $('p-phone').value.trim();
    if (phone && !/^[0-9+\-\s]{9,15}$/.test(phone)) { say('מספר הטלפון לא תקין', false); return; }
    profile.name = $('p-name').value.trim();
    profile.user = $('p-user').value.trim();
    profile.phone = phone;
    profile.photo = photo.src.startsWith('data:') ? photo.src : profile.photo;
    try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch (err) { say('לא ניתן לשמור בדפדפן הזה', false); return; }
    $('p-pass').value = '';
    $('p-pass2').value = '';
    // show the new name and photo in the header and menu right away
    document.querySelectorAll('.user__name, .sidebar__name').forEach((el) => { el.textContent = profile.name; });
    if (profile.photo) document.querySelectorAll('.user__photo').forEach((el) => { el.src = profile.photo; });
    say(pass ? 'הפרטים והסיסמה נשמרו' : 'הפרטים נשמרו', true);
  });

  /* ---------- What I collected ---------- */
  const shop = read('en-app:shop');
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const sentences = (shop && shop.sentences) || [
    { en: 'Dream big!', he: 'חלום בגדול!', date: now - DAY, found: 'dre' },
    { en: 'Be brave!', he: 'תהיה אמיץ!', date: now - 3 * DAY, found: 'berav' },
    { en: 'Never give up!', he: 'לעולם אל תוותר!', date: now - 9 * DAY, found: 'nevgiu' },
  ];
  $('p-coins').textContent = (shop && shop.coins) ?? (document.querySelector('.stat--coins .stat__value')?.textContent || 350);
  $('p-chests').textContent = document.querySelector('.stat--chest .stat__value')?.textContent || 3;

  const lettersOf = (t) => [...new Set(t.toLowerCase().replace(/[^a-z]/g, ''))];
  const leftIn = (s) => lettersOf(s.en).filter((l) => !s.found.includes(l)).length;
  const fmt = (t) => new Date(t).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
  const tiles = (s) => s.en.split(' ').map((word) => `<span class="s-word">${word.split('').map((ch) => {
    const l = ch.toLowerCase();
    if (!/[a-z]/.test(l)) return `<b class="s-tile s-tile--mark">${ch}</b>`;
    return s.found.includes(l) ? `<b class="s-tile is-found">${ch}</b>` : '<b class="s-tile">?</b>';
  }).join('')}</span>`).join('');
  $('sentences').innerHTML = sentences.map((s, i) => {
    const left = leftIn(s);
    return `<li class="s-item${i === 0 ? ' is-active' : ''}${left === 0 ? ' is-done' : ''}">
        <div class="s-item__top">
          ${i === 0 ? '<span class="s-badge">המשפט הנוכחי</span>' : ''}
          <span class="s-date">${fmt(s.date)}</span>
          ${left === 0 ? '<span class="s-status s-status--done"><i class="s-check">✓</i> הושלם</span>' : `<span class="s-status">נשארו ${left} אותיות</span>`}
        </div>
        <div class="s-tiles" lang="en" dir="ltr">${tiles(s)}</div>
        ${left === 0 ? `<p class="s-he">${s.he}</p>` : ''}
      </li>`;
  }).join('');

  /* ---------- Trophy bubble and loader (same as the other pages) ---------- */
  const trophy = document.querySelector('.trophy');
  if (trophy) {
    const setTrophy = (open) => trophy.setAttribute('aria-expanded', String(open));
    trophy.addEventListener('click', (e) => { e.stopPropagation(); setTrophy(trophy.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('click', (e) => { if (!e.target.closest('.trophy-hint')) setTrophy(false); });
  }
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 3000))])
    .then(() => requestAnimationFrame(() => {
      const loader = document.getElementById('loader');
      if (loader) {
        const pctEl = document.getElementById('loader-pct');
        const barEl = document.getElementById('loader-bar');
        const t0 = performance.now();
        const run = (t) => {
          const p = Math.min(1, (t - t0) / 700);
          const v = Math.round(100 * (1 - Math.pow(1 - p, 3)));
          pctEl.textContent = v;
          barEl.style.width = `${v}%`;
          if (p < 1) requestAnimationFrame(run);
          else setTimeout(() => loader.classList.add('is-done'), 150);
        };
        requestAnimationFrame(run);
        setTimeout(() => loader.remove(), 2200);
      }
      document.body.classList.remove('is-loading');
    }));
})();
