// Admin – the screen editor (one lesson or practice): a fixed title, folding parts
// ("פרטי המסך", "הזברה", the template's own parts), a formatting bar for texts,
// the shared levels part for all the practices, and a live preview at the side.
// Kept with the lesson / practice as `scr`; older data is read into it on the first change.
(function () {
  const { UI } = window.Admin;
  const esc = UI.esc;

  /* ---------- texts with marks: **bold** · !!red!! · {pink:…} · {green:…} · {letter:…} · {he:…} · {say:…} ---------- */
  const MARKS = { bold: ['**', '**'], red: ['!!', '!!'], pink: ['{pink:', '}'], green: ['{green:', '}'], letter: ['{letter:', '}'], he: ['{he:', '}'], say: ['{say:', '}'] };
  const TOOL = {
    bold: ['מודגש', '<b>B</b>'], red: ['אדום', '<span class="rt-red">אדום</span>'], pink: ['ורוד', '<span class="rt-pink">ורוד</span>'], green: ['ירוק', '<span class="rt-green">ירוק</span>'],
    letter: ['אות', '<span class="rt-letter">a</span> אות'], he: ['הגייה בעברית', 'הגייה בעברית'], say: ['מילה להשמעה', '🔊 מילה להשמעה'],
  };
  function mdToHtml(md) {
    let h = esc(md || '');
    h = h.replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>');
    h = h.replace(/!!([\s\S]+?)!!/g, '<span data-m="red">$1</span>');
    for (let n = 0; n < 3; n += 1) h = h.replace(/\{(pink|green|letter|he|say):([^{}]*?)\}/g, '<span data-m="$1">$2</span>');
    return h.replace(/\n/g, '<br>');
  }
  function htmlToMd(root) {
    const walk = (n) => {
      let out = '';
      n.childNodes.forEach((c) => {
        if (c.nodeType === 3) out += c.nodeValue.replace(/ /g, ' ');
        else if (c.nodeName === 'BR') out += '\n';
        else if (c.nodeName === 'B' || c.nodeName === 'STRONG') { const t = walk(c); out += t ? `**${t}**` : ''; }
        else if (c.dataset && c.dataset.m && MARKS[c.dataset.m]) { const t = walk(c); const m = MARKS[c.dataset.m]; out += t ? m[0] + t + m[1] : ''; }
        else if (c.nodeName === 'DIV' || c.nodeName === 'P') out += (out && !out.endsWith('\n') ? '\n' : '') + walk(c);
        else out += walk(c);
      });
      return out;
    };
    return walk(root).replace(/\n+$/, '');
  }
  // the same marks, as the students see them (the preview)
  function mdView(md) {
    return mdToHtml(md).replace(/<span data-m="(\w+)">/g, '<span class="pv-$1">');
  }
  const rt = (path, value, tools, opts = {}) => `<div class="rt${opts.small ? ' rt--small' : ''}">
      <div class="rt__bar" role="toolbar" aria-label="עיצוב הטקסט">${tools.map((t) => `<button type="button" data-rt-cmd="${t}" title="${TOOL[t][0]}" aria-label="${TOOL[t][0]}">${TOOL[t][1]}</button>`).join('')}</div>
      <div class="rt__ed" contenteditable="true" role="textbox" aria-multiline="${opts.single ? 'false' : 'true'}" aria-label="${esc(opts.label || '')}" data-rt="${path}" dir="rtl" data-ph="${esc(opts.ph || '')}">${mdToHtml(value)}</div>
    </div>`;
  function applyMark(ed, kind) {
    const s = getSelection();
    if (!s.rangeCount) return;
    const r = s.getRangeAt(0);
    if (r.collapsed || !ed.contains(r.commonAncestorContainer)) return;
    let a = r.commonAncestorContainer;
    if (a.nodeType !== 1) a = a.parentNode;
    const same = a.closest(kind === 'bold' ? 'b, strong' : `[data-m="${kind}"]`);
    if (same && ed.contains(same)) same.replaceWith(...same.childNodes);
    else {
      const w = document.createElement(kind === 'bold' ? 'b' : 'span');
      if (kind !== 'bold') w.dataset.m = kind;
      w.appendChild(r.extractContents());
      r.insertNode(w);
    }
    ed.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* ---------- small helpers ---------- */
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  function setPath(o, p, v) { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((a, k) => (a[k] == null ? (a[k] = /^\d+$/.test(k) ? [] : {}) : a[k]), o); t[last] = v; }
  const ICON = {
    grip: UI.ICON.grip,
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3"/></svg>',
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V6M8 10l4-4 4 4M5 18h14"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
    speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5"/><path d="M12 19v-7M9 14.5l3-3 3 3"/></svg>',
    img: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M5 17l4.5-4.5 3 3 2.5-2.5L19 17"/></svg>',
    dots: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  };
  const btn = (attrs, label, icon, cls = '') => `<button type="button" class="scr-ib${cls}" ${attrs} aria-label="${esc(label)}" title="${esc(label)}">${ICON[icon]}</button>`;
  const addRow = (attrs, label) => `<button type="button" class="w-addrow scr-add" ${attrs}>${ICON.plus}${esc(label)}</button>`;
  const fmtT = (t) => { if (t === '' || t == null || Number.isNaN(Number(t))) return '—'; const s = Number(t); const m = Math.floor(s / 60); const r = (s - m * 60).toFixed(1).padStart(4, '0'); return `${String(m).padStart(2, '0')}:${r}`; };
  const parseT = (v) => { v = String(v).trim(); if (!v || v === '—') return ''; const m = v.match(/^(\d+):(\d+(?:\.\d+)?)$/); if (m) return Math.round((Number(m[1]) * 60 + Number(m[2])) * 10) / 10; const n = Number(v); return Number.isFinite(n) ? n : ''; };
  const speak = (text, lang = 'en-US') => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(text || '').replace(/[*!{}]|pink:|green:|letter:|he:|say:/g, '')); u.lang = lang; speechSynthesis.speak(u); } catch (e) { /* no speech */ } };
  const ZEBRAS = ['zebra.webp', 'zebra-hoop.webp', 'zebra-doctor.webp', 'zebra-doctor-loop2.webm', 'zebra-detective-idle.webm', 'zebra-magic-idle.webm', 'zebra-review-coach.webm', 'zebra-review-idle.webm', 'zebra-single-idle2.webm', 'zebra-smiles-i.webm', 'zebra-sounds-idle.webm', 'zebra-whistling-idle.webm', 'zebra-blending-idle.mp4', 'zebra-smiles-i-idle.mp4'];
  const isVideo = (n) => /\.(mp4|webm)$/i.test(n || '');

  /* ---------- the templates ---------- */
  const LESSON_T = ['הסבר', 'הסבר בלשוניות', 'שיר האותיות'];
  const PRACTICE_T = { 'אותיות': 'letter', 'מילים': 'word', 'מילים עם הברות': 'syll', 'משפטים': 'sent', 'חזרות': 'word' };
  const ITEM = { letter: ['אות', 'אותיות', 'a'], word: ['מילה', 'מילים', 'cat'], syll: ['מילה', 'מילים', 'ba-na-na'], sent: ['משפט', 'משפטים', 'The cat is hungry'] };
  const VOWELS_TABS = {
    discover: { title: 'קראו את הצלילים הבאים בעברית:', sounds: [['בְּ', 'buh'], ['בָּ', 'bah'], ['בִּ', 'bee']], bubble: '💭 **איך ידעתם איך לקרוא כל צליל?**\nנכון! לפי {pink:סימן הניקוד} מתחת לאות!' },
    build: { title: 'עכשיו בואו נסתכל על האות b באנגלית:', letter: 'b', shva: 'האות b = כמו **ב** בעברית\nעם שווא – הצליל **בְּ**', kamatz: 'עם קמץ מתחת = **בָּ**', result: ['בָּ', 'bah'] },
    read: { lines: ['**באנגלית אין לנו את הסימנים האלו!**', '**במקום זה אנחנו משתמשים באותיות!**', 'האותיות האלו נקראות {pink:אותיות ניקוד}', 'במקום שהן יהיו **מתחת** לאות – הן מגיעות {green:אחריה}'], compare: ['בָּ', 'b', 'a', 'bah'] },
  };
  const BLANK_TABS = { discover: { title: '', sounds: [], bubble: '' }, build: { title: '', letter: '', shva: '', kamatz: '', result: ['', ''] }, read: { lines: [], compare: ['', '', '', ''] } };
  const EXTRAS = {
    notes: ['תיבת הערות לצד ההסבר', true], challenge: ['תיבת אתגר', true], join: ['חיבור אותיות (b + a = ba)', false], remember: ['חשוב לזכור', false], ways: ['דרכים לקרוא', false],
  };

  window.ScreenEditor = function ScreenEditor(ctx) {
    const open = new Map(); // which parts are open, by screen and part
    const pvTab = new Map(); // the tab the preview shows (the tabs template)
    const durations = new Map();
    let mark = null; // the quick marking of the song: { key }
    let pop = null; // a small popover

    // the screen's data: read from `scr`, or from what it had before (nothing is written until something changes)
    function build(it) {
      const L = ctx.legacy(it) || {};
      const tpl = it.template || '';
      const c = it.common || {};
      const pick = (f) => (c[f] != null ? c[f] : L[f] != null ? L[f] : '');
      const m = {
        common: { title: pick('title'), red: pick('red'), tab: pick('tab'), button: pick('button'), coins: pick('coins'), empty: !!pick('empty') },
        zebra: { media: null, loop: true, says: L.says || '', reads: L.reads && L.reads !== L.says ? L.reads : '', showReads: !!(L.reads && L.reads !== L.says), voice: '', boxTitle: '' },
      };
      if (tpl === 'הסבר בלשוניות') m.tabs = clone(it.page === 'vowels-lesson.html' ? VOWELS_TABS : BLANK_TABS);
      if (tpl === 'הסבר') { m.extras = []; m.text = it.desc || ''; }
      if (tpl === 'שיר האותיות') m.song = { file: L.file || '', fileName: L.fileName || (L.file || '').split('/').pop() || '', letters: clone(L.letters || []) };
      if (PRACTICE_T[tpl]) {
        m.zebra.says = '';
        m.instr = { hint: '', says: L.says || it.desc || '', voice: '', helpSong: L.helpSong !== false && tpl === 'אותיות' };
        const lv = (L.levels || []).map((x) => (Array.isArray(x) ? { name: '', instr: null, items: x.slice() } : { name: x.name || '', instr: x.instr == null || x.instr === '' ? null : x.instr, items: (x.items || []).slice() }));
        m.levels = { word: tpl === 'אותיות' ? 'שלב' : L.levelWord || 'רמה', title: tpl === 'אותיות' ? '' : L.levelsTitle || '', visible: L.levelsVisible || '', list: lv, hard: [], pics: {} };
      }
      return m;
    }
    const view = (it) => it.scr || build(it);
    const ensure = (it) => { if (!it.scr) it.scr = build(it); return it.scr; };
    const stepOf = new Map();
    const isOpen = (key, sec, dflt) => (open.has(`${key}|${sec}`) ? open.get(`${key}|${sec}`) : dflt);
    // is there content of the template's own (then the template can't be changed)
    function hasContent(it) {
      if (it.page) return true;
      const m = view(it);
      if (m.tabs && JSON.stringify(m.tabs) !== JSON.stringify(BLANK_TABS)) return true;
      if (m.extras && (m.extras.length || (m.text || '').trim())) return true;
      if (m.song && (m.song.fileName || m.song.letters.length)) return true;
      if (m.levels && m.levels.list.some((l) => l.items.length)) return true;
      return !!(it.desc || '').trim();
    }

    /* ---------- the parts ---------- */
    const det = (key, sec, title, sum, body, dflt) => `<details class="scr-sec" data-sec="${key}|${sec}"${isOpen(key, sec, dflt) ? ' open' : ''}>
        <summary><span class="scr-sec__t">${title}</span>${sum ? `<span class="scr-sec__sum">${sum}</span>` : ''}<span class="scr-sec__chev" aria-hidden="true"></span></summary>
        <div class="scr-sec__in">${body}</div>
      </details>`;
    const field = (key, path, label, val, opts = {}) => `<label class="a-field"><span>${label}</span><input data-f="${key}|${path}" value="${esc(val ?? '')}"${opts.ltr ? ' dir="ltr"' : ''}${opts.ph ? ` placeholder="${esc(opts.ph)}"` : ''}${opts.type ? ` type="${opts.type}"` : ''}>${opts.help ? `<small class="a-help">${opts.help}</small>` : ''}</label>`;
    const sw = (key, path, on, label, note) => `<label class="scr-sw"><span class="a-switch"><input type="checkbox" data-fc="${key}|${path}"${on ? ' checked' : ''} aria-label="${esc(label)}"><span class="a-switch__track" aria-hidden="true"></span></span><span><b>${label}</b>${note ? `<small>${note}</small>` : ''}</span></label>`;
    function voiceRow(key, which, text) {
      const u = ctx.urls.get(`voice:${key}:${which}`);
      return `<div class="scr-voice">
          ${btn(`data-voice-rec="${which}"`, 'הקלטה', 'mic')}
          <label class="scr-ib" title="העלאת קובץ קול" aria-label="העלאת קובץ קול">${ICON.up}<input class="sr-only" type="file" accept="audio/*" data-voice-file="${which}"></label>
          ${btn(`data-voice-play="${which}"`, 'השמעה', 'play')}
          <span class="scr-voice__t">${u ? 'הקלטה' : 'קול ממוחשב (Zebra Teacher)'}</span>
          ${u ? `<button type="button" class="scr-link" data-voice-del="${which}">מחיקת ההקלטה</button>` : ''}
        </div>`;
    }

    // פרטי המסך
    function detailsPart(key, it, meta) {
      const c = view(it).common;
      const sum = [c.title, c.coins ? `${c.coins} מטבעות` : ''].filter(Boolean).join(' · ');
      const filled = !!(c.title && c.red);
      return det(key, 'details', 'פרטי המסך', sum, `
          <div class="a-grid">
            <label class="a-field"><span>שם ה${meta.word}</span><input data-st-name="${key}" value="${esc(it.name || '')}" placeholder="שם ה${meta.word}"></label>
            <label class="a-field"><span>תבנית</span>${meta.templateSelect}</label>
          </div>
          ${field(key, 'common.title', 'כותרת', c.title)}
          <div class="a-grid">${field(key, 'common.red', 'השורה האדומה מתחת לכותרת', c.red)}${field(key, 'common.tab', 'השורה השנייה בלשונית', c.tab)}</div>
          <div class="a-grid">${field(key, 'common.button', 'הכפתור בסוף המסך', c.button, { help: 'ריק = הנוסח הרגיל' })}${field(key, 'common.coins', 'מטבעות על סיום המסך', c.coins, { help: 'ריק = לפי הגדרות המטבעות', type: 'number' })}</div>
          <label class="w-song__empty"><input type="checkbox" data-fc="${key}|common.empty"${c.empty ? ' checked' : ''}><span><b>שלב ריק</b> – התלמיד רואה רק את הכותרת והכפתורים, בלי התוכן. מסמנים כשעוד אין תוכן למסך.</span></label>`, meta.isNew || !filled);
    }

    // הזברה: the media (every template); for a lesson also what she says and her voice
    function zebraPart(key, it, meta) {
      const z = view(it).zebra;
      const mediaUrl = z.media ? (ctx.urls.get(`zmedia:${z.media}`) || (ZEBRAS.includes(z.media) ? `assets/${z.media}` : '')) : '';
      const media = z.media
        ? `<div class="scr-media">
            <span class="scr-media__th">${isVideo(z.media) ? `<video src="${mediaUrl}" autoplay muted loop playsinline></video>` : `<img src="${mediaUrl}" alt="">`}</span>
            <span class="scr-media__info"><b dir="ltr">${esc(z.media)}</b><small>${isVideo(z.media) ? 'וידאו' : 'תמונה'}</small></span>
            <span class="scr-media__acts"><label class="scr-link">החלפה<input class="sr-only" type="file" accept="video/mp4,video/webm,image/png,image/webp,image/gif" data-zmedia></label><button type="button" class="scr-link" data-zmedia-del>הסרה</button></span>
          </div>
          ${isVideo(z.media) ? sw(key, 'zebra.loop', z.loop !== false, 'לולאה', 'הווידאו חוזר על עצמו') : ''}`
        : `<label class="scr-drop" data-drop="zmedia"><input class="sr-only" type="file" accept="video/mp4,video/webm,image/png,image/webp,image/gif" data-zmedia>${ICON.up}<b>גררו וידאו או תמונה של הזברה, או לחצו לבחירה</b><small>mp4 / webm (גם עם רקע שקוף) · png / webp / gif</small></label>
          <p class="a-help">ריק = הזברה הרגילה</p>`;
      const lib = `<button type="button" class="scr-link" data-zlib>בחירה מזברות קיימות</button>`;
      let body = `<div class="scr-sub">מדיה</div>${media}${lib}`;
      if (meta.kind === 'lessons') {
        body += `<div class="scr-sub">מה הזברה אומרת</div>
          ${rt(`${key}|zebra.says`, z.says, ['bold', 'red', 'letter', 'he', 'pink', 'say'], { label: 'מה הזברה אומרת', ph: 'הטקסט בבועה של הזברה' })}
          ${voiceRow(key, 'zebra', z.reads || z.says)}
          ${z.showReads ? `<label class="a-field"><span>מה הזברה מקריאה</span><textarea rows="3" data-f="${key}|zebra.reads" placeholder="ריק = מקריאה את הטקסט שמוצג">${esc(z.reads)}</textarea></label>` : '<button type="button" class="scr-link" data-show-reads>+ נוסח הקראה שונה</button>'}
          ${it.template === 'הסבר' ? field(key, 'zebra.boxTitle', 'כותרת לתיבת ההסבר (לא חובה)', z.boxTitle) : ''}`;
      }
      return det(key, 'zebra', 'הזברה', z.media ? esc(z.media) : '', body, true);
    }

    // הסבר: the text and the additions
    function extrasPart(key, it) {
      const m = view(it);
      const used = new Set(m.extras.map((x) => x.type));
      const card = (x, n) => {
        let inner = '';
        if (x.type === 'join') inner = `${(x.rows || []).map((r, j) => `<div class="scr-formula" data-sort-group="xj:${key}:${n}"><button type="button" class="w-handle" data-drag aria-label="גרירה">${ICON.grip}</button>${chip(key, `extras.${n}.rows.${j}.0`, r[0], 'אות')}<span class="scr-op">+</span>${chip(key, `extras.${n}.rows.${j}.1`, r[1], 'אות ניקוד')}<span class="scr-op">=</span>${chip(key, `extras.${n}.rows.${j}.2`, r[2], 'יחד')}${btn(`data-say-path="extras.${n}.rows.${j}.2"`, 'השמעה', 'speaker')}${btn(`data-arr-del="extras.${n}.rows|${j}"`, 'מחיקה', 'trash', ' scr-hov')}</div>`).join('')}${addRow(`data-arr-add="extras.${n}.rows" data-arr-new='["","",""]'`, 'הוספת חיבור')}`;
        else if (x.type === 'ways') inner = `${(x.lines || []).map((l, j) => `<div class="scr-line" data-sort-group="xw:${key}:${n}"><button type="button" class="w-handle" data-drag aria-label="גרירה">${ICON.grip}</button>${rt(`${key}|extras.${n}.lines.${j}`, l, ['bold', 'pink', 'say'], { small: true, single: true })}${btn(`data-arr-del="extras.${n}.lines|${j}"`, 'מחיקה', 'trash', ' scr-hov')}</div>`).join('')}${addRow(`data-arr-add="extras.${n}.lines" data-arr-new='""'`, 'הוספת דרך')}`;
        else inner = rt(`${key}|extras.${n}.text`, x.text || '', ['bold', 'red', 'letter', 'pink', 'say'], { label: EXTRAS[x.type][0] });
        return `<li class="scr-card" data-sort-group="xe:${key}">
            <details${isOpen(key, `ex${n}`, true) ? ' open' : ''} data-sec="${key}|ex${n}">
              <summary><button type="button" class="w-handle" data-drag aria-label="גרירת הרכיב">${ICON.grip}</button><input class="scr-card__t" data-f="${key}|extras.${n}.title" value="${esc(x.title || EXTRAS[x.type][0])}" aria-label="כותרת הרכיב"><span class="scr-sec__chev" aria-hidden="true"></span>${btn(`data-arr-del="extras|${n}"`, 'מחיקת הרכיב', 'trash', ' scr-hov')}</summary>
              <div class="scr-card__in">${inner}</div>
            </details>
          </li>`;
      };
      const menu = Object.entries(EXTRAS).map(([t, [label, once]]) => `<button type="button" role="menuitem" data-extra-add="${t}"${once && used.has(t) ? ' disabled' : ''}>${label}</button>`).join('');
      return det(key, 'extras', 'תוספות', m.extras.length ? `${m.extras.length} רכיבים` : '', `
          ${m.extras.length ? `<ol class="scr-cards">${m.extras.map(card).join('')}</ol>` : '<p class="scr-empty">אין תוספות להסבר</p>'}
          <div class="scr-addmenu"><button type="button" class="w-addrow scr-add" data-extra-menu aria-haspopup="menu">${ICON.plus}הוספת רכיב</button><div class="scr-menu" role="menu" hidden>${menu}</div></div>`, true);
    }
    const chip = (key, path, val, label, ltr = true) => `<label class="scr-chip"><input data-f="${key}|${path}" value="${esc(val ?? '')}"${ltr ? ' dir="ltr"' : ''} aria-label="${label}"><small>${label}</small></label>`;

    // הסבר בלשוניות: three folding tabs
    function tabsPart(key, it) {
      const t = view(it).tabs;
      const d = t.discover; const b = t.build; const r = t.read;
      const tab = (id, n, name, sum, body) => `<details class="scr-tab" data-sec="${key}|tab-${id}" data-pv-tab="${id}"${isOpen(key, `tab-${id}`, n === 1) ? ' open' : ''}><summary><span class="scr-tab__n">${n}</span><b>${name}</b><span class="scr-sec__sum">${sum}</span><span class="scr-sec__chev" aria-hidden="true"></span></summary><div class="scr-card__in">${body}</div></details>`;
      const sounds = `<div class="scr-cols"><span>עברית</span><span>אנגלית</span><span>השמעה</span></div>
          ${d.sounds.map((s, j) => `<div class="scr-row" data-sort-group="xt:${key}"><button type="button" class="w-handle" data-drag aria-label="גרירה">${ICON.grip}</button><input lang="he" data-f="${key}|tabs.discover.sounds.${j}.0" value="${esc(s[0])}" aria-label="בעברית"><input dir="ltr" data-f="${key}|tabs.discover.sounds.${j}.1" value="${esc(s[1])}" aria-label="באנגלית">${btn(`data-say-path="tabs.discover.sounds.${j}.1"`, 'השמעה', 'speaker')}${btn(`data-arr-del="tabs.discover.sounds|${j}"`, 'מחיקה', 'trash', ' scr-hov')}</div>`).join('')}
          ${addRow(`data-arr-add="tabs.discover.sounds" data-arr-new='["",""]'`, 'צליל')}`;
      const T3 = ['bold', 'pink', 'green'];
      return det(key, 'tabs', 'הלשוניות', '', `
          ${tab('discover', 1, 'מגלים', `${d.sounds.length} צלילים`, `<div class="scr-sub">הכותרת</div>${rt(`${key}|tabs.discover.title`, d.title, T3, { single: true, small: true })}<div class="scr-sub">הצלילים</div>${sounds}<div class="scr-sub">התיבה שמתחת</div>${rt(`${key}|tabs.discover.bubble`, d.bubble, T3)}`)}
          ${tab('build', 2, 'מרכיבים', [b.letter, b.result[0]].filter(Boolean).join(' · '), `<div class="scr-sub">הכותרת</div>${rt(`${key}|tabs.build.title`, b.title, T3, { single: true, small: true })}
            <div class="a-grid"><label class="a-field"><span>האות באנגלית</span><input dir="ltr" data-f="${key}|tabs.build.letter" value="${esc(b.letter)}"></label></div>
            <div class="scr-sub">מתחת לאות (עם שווא)</div>${rt(`${key}|tabs.build.shva`, b.shva, T3, { small: true })}
            <div class="scr-sub">מתחת לאות עם הקמץ</div>${rt(`${key}|tabs.build.kamatz`, b.kamatz, T3, { small: true, single: true })}
            <div class="scr-sub">התוצאה</div><div class="scr-formula">${chip(key, 'tabs.build.result.0', b.result[0], 'עברית', false)}<span class="scr-op">=</span>${chip(key, 'tabs.build.result.1', b.result[1], 'מה נשמע')}${btn('data-say-path="tabs.build.result.1"', 'השמעה', 'speaker')}</div>`)}
          ${tab('read', 3, 'קוראים', `${r.lines.length} שורות`, `<div class="scr-sub">השורות</div>
            ${r.lines.map((l, j) => `<div class="scr-line" data-sort-group="xr:${key}"><button type="button" class="w-handle" data-drag aria-label="גרירה">${ICON.grip}</button>${rt(`${key}|tabs.read.lines.${j}`, l, T3, { small: true, single: true })}${btn(`data-arr-del="tabs.read.lines|${j}"`, 'מחיקה', 'trash', ' scr-hov')}</div>`).join('')}
            ${addRow(`data-arr-add="tabs.read.lines" data-arr-new='""'`, 'שורה')}
            <div class="scr-sub">בעברית ← באנגלית</div><div class="scr-formula">${chip(key, 'tabs.read.compare.0', r.compare[0], 'עברית', false)}<span class="scr-op">←</span>${chip(key, 'tabs.read.compare.1', r.compare[1], 'אות')}${chip(key, 'tabs.read.compare.2', r.compare[2], 'אות ניקוד')}<span class="scr-op">=</span>${chip(key, 'tabs.read.compare.3', r.compare[3], 'מה נשמע')}${btn('data-say-path="tabs.read.compare.3"', 'השמעה', 'speaker')}</div>`)}`, true);
    }

    // שיר האותיות: the file, the player with its timeline, the letters
    function songPart(key, it) {
      const s = view(it).song;
      const url = ctx.urls.get(`song:${key}`) || s.file || '';
      const dur = durations.get(key) || 0;
      const marks = dur ? s.letters.map((r, n) => (r.t === '' || r.t == null ? '' : `<button type="button" class="scr-mark${n % 2 ? ' is-low' : ''}" style="right:calc(14px + (100% - 28px) * ${Math.min(1, Number(r.t) / dur)})" data-mark="${n}" aria-label="${esc(r.l)} – ${fmtT(r.t)}" title="${esc(r.l)} · ${fmtT(r.t)}"><span>${esc(r.l)}</span></button>`)).join('') : '';
      const next = mark && mark.key === key ? s.letters.findIndex((r) => r.t === '' || r.t == null) : -1;
      const file = url
        ? `<div class="scr-file"><span class="scr-file__n" dir="ltr">${esc(s.fileName || url.split('/').pop())}</span><small>${dur ? fmtT(dur).replace(/\.\d$/, '') : ''}</small><label class="scr-link">החלפה<input class="sr-only" type="file" accept="audio/*,video/mp4,video/webm" data-song-file></label><button type="button" class="scr-link" data-song-del>הסרה</button></div>`
        : `<label class="scr-drop" data-drop="song"><input class="sr-only" type="file" accept="audio/*,video/mp4,video/webm" data-song-file>${ICON.up}<b>גררו קובץ שיר לכאן או לחצו לבחירה</b><small>mp3 / wav</small></label>`;
      const player = url ? `<audio data-song-el src="${url}" preload="metadata"></audio>
          <div class="scr-player">
            ${btn('data-song-toggle', 'ניגון / עצירה', 'play', ' scr-ib--big')}
            <span class="scr-player__t" data-song-time>0:00 / ${dur ? fmtT(dur).replace(/\.\d$/, '') : '–'}</span>
            <span class="scr-quick">${mark && mark.key === key ? `<button type="button" class="a-btn a-btn--primary scr-now" data-mark-now>עכשיו! (רווח)</button><button type="button" class="scr-link" data-mark-stop>עצירה (Esc)</button>` : '<button type="button" class="a-btn" data-mark-start>סימון מהיר</button>'}</span>
          </div>
          <div class="scr-line-t" data-song-line><i data-song-prog></i>${marks}</div>` : '';
      const rows = s.letters.map((r, n) => `<li class="scr-lt${n === next ? ' is-next' : ''}" data-sort-group="xs:${key}">
          <button type="button" class="w-handle" data-drag aria-label="גרירה">${ICON.grip}</button>
          <input class="scr-lt__l" dir="ltr" maxlength="3" data-f="${key}|song.letters.${n}.l" value="${esc(r.l)}" aria-label="האות">
          <input class="scr-lt__t${r.t === '' || r.t == null ? ' is-none' : ''}" dir="ltr" data-song-t="${n}" value="${fmtT(r.t)}" aria-label="הזמן של ${esc(r.l)}">
          ${btn(`data-song-stamp="${n}"`, 'קביעה לפי הזמן בנגן', 'clock', url ? '' : ' is-off')}
          ${btn(`data-song-play="${n}"`, 'ניגון מהזמן של האות', 'play', url && r.t !== '' && r.t != null ? '' : ' is-off')}
          <span class="scr-lt__snd">
            <label class="scr-ib${ctx.urls.has(`word:${r.l}`) ? ' is-on' : ''}" title="העלאת קובץ שמע של האות" aria-label="העלאת קובץ שמע של ${esc(r.l)}">${ICON.cloud}<input class="sr-only" type="file" accept="audio/*" data-wfile="${esc(r.l)}"></label>
            ${btn(`data-item-rec="${esc(r.l)}"`, `הקלטת ${r.l}`, 'mic', ctx.urls.has(`word:${r.l}`) ? ' is-on' : '')}
          </span>
          <img class="scr-lt__pic" src="${((view(it).levels || {}).pics || {})[r.l] ? ctx.urls.get(`pic:${r.l}`) || '' : `assets/cards/card-${esc((r.l || '').toLowerCase())}.webp`}" alt="" onerror="this.style.visibility='hidden'">
          ${btn(`data-slt-menu="${n}"`, 'אפשרויות', 'dots', ' scr-lt__more')}
        </li>`).join('');
      return det(key, 'song', 'השיר', `${s.letters.filter((r) => r.t !== '' && r.t != null).length}/${s.letters.length} אותיות סומנו`, `
          <div class="scr-sub">קובץ השיר</div>${file}
          ${player ? `<div class="scr-sub">נגן וציר זמן</div>${player}` : ''}
          <div class="scr-sub">האותיות</div>
          ${url ? '<p class="a-help">מנגנים את השיר ולוחצים ⏱ כשהאות נשמעת, או משתמשים בסימון מהיר</p>' : '<p class="scr-note">קודם מעלים שיר, ואז מסמנים בו את האותיות</p>'}
          <ol class="scr-lts">${rows}</ol>
          <div class="scr-adds">${addRow('data-arr-add="song.letters" data-arr-new=\'{"l":"","t":""}\'', 'אות')}${addRow('data-song-abc', 'כל האלפבית a–z')}</div>`, true);
    }

    // a practice: the instruction (and for letters the song's help window)
    function instrPart(key, it, meta) {
      const m = view(it).instr;
      const letters = it.template === 'אותיות';
      return det(key, 'instr', 'ההוראה', '', `
          <div class="scr-sub">ההנחיה מעל התרגול</div>
          ${rt(`${key}|instr.hint`, m.hint, ['bold', 'red'], { small: true, label: 'ההנחיה מעל התרגול', ph: 'למשל: הסתכלו על האות, אמרו את שמה והקליטו את עצמכם' })}
          <label class="a-field"><span>מה הזברה אומרת בכפתור "האזינו להוראה"</span><textarea rows="3" data-f="${key}|instr.says" placeholder="ריק = בלי כפתור">${esc(m.says)}</textarea></label>
          ${voiceRow(key, 'instr', m.says)}
          ${letters ? `${sw(key, 'instr.helpSong', m.helpSong, 'חלון עזרה עם שיר האותיות', 'ליד התרגול, מהשיר של העולם')}${m.helpSong && !meta.islandHasSong ? '<p class="scr-warn">אין עדיין שיר אותיות בעולם הזה. החלון לא יוצג עד שיתווסף</p>' : ''}` : ''}`, true);
    }

    // the levels, shared by every practice: only the item in a level changes
    function levelsPart(key, it) {
      const L = view(it).levels;
      const type = PRACTICE_T[it.template] || 'word';
      const [one, many, ph] = ITEM[type];
      const word = (L.word === 'טור' ? 'שלב' : L.word) || 'רמה';
      const hard = new Set(L.hard || []);
      const cards = L.list.map((lv, n) => {
        const items = lv.items;
        let sum = `${items.length} ${many}`;
        if (type === 'letter') sum = items.slice(0, 6).join(' ') + (items.length > 6 ? ` +${items.length - 6}` : '');
        if (type === 'sent') { const hw = new Set(); items.forEach((x) => words(x).forEach((w) => { if (hard.has(w.key)) hw.add(w.key); })); sum = `${items.length} משפטים · ${hw.size} מילים קשות`; }
        let list;
        if (type === 'letter') {
          list = `<ol class="scr-grid">${items.map((l, j) => { const pic = (L.pics || {})[l]; const src = pic ? ctx.urls.get(`pic:${l}`) || '' : `assets/cards/card-${esc((l || '').toLowerCase())}.webp`; return `<li class="scr-lcard" data-sort-group="xi:${key}:${n}"><button type="button" class="w-handle" data-drag aria-label="גרירה">${ICON.grip}</button><button type="button" class="scr-lcard__main" data-lcard="${n}:${j}"><img src="${src}" alt="" onerror="this.style.visibility='hidden'"><b dir="ltr">${esc(l)}</b></button>${btn(`data-arr-del="levels.list.${n}.items|${j}"`, `מחיקת ${l}`, 'trash', ' scr-hov')}</li>`; }).join('')}
            <li class="scr-lcard scr-lcard--add">${pop && pop.type === 'addLetter' && pop.key === key && pop.n === n ? `<input dir="ltr" maxlength="3" class="scr-lcard__in" data-add-letter="${n}" placeholder="אות" aria-label="אות חדשה">` : `<button type="button" class="scr-lcard__plus" data-add-letter-open="${n}">${ICON.plus}אות</button>`}</li></ol>`;
        } else {
          list = `<ol class="scr-items">${items.map((x, j) => {
            let extra = '';
            if (type === 'syll') extra = `<span class="scr-syl" aria-hidden="true">${String(x).split('-').filter(Boolean).map((p, q) => `<i class="c${q % 4}">${esc(p)}</i>`).join('')}</span>`;
            if (type === 'sent') extra = `<span class="scr-words">${words(x).map((w) => { const has = ctx.urls.has(`word:${w.key}`); return `<span class="scr-w${hard.has(w.key) ? ' is-hard' : ''}" data-w="${esc(w.key)}"><button type="button" data-hard="${esc(w.key)}">${esc(w.text)}</button>${hard.has(w.key) ? `<button type="button" class="scr-w__spk${has ? ' is-on' : ''}" data-wpop="${esc(w.key)}" aria-label="ההקלטה של ${esc(w.key)}">${ICON.speaker}</button>` : ''}</span>`; }).join('')}</span>`;
            const rec = type !== 'sent' ? `${btn(`data-item-rec="${esc(type === 'syll' ? String(x).replace(/-/g, '') : x)}"`, 'הקלטה', 'mic', ctx.urls.has(`word:${type === 'syll' ? String(x).replace(/-/g, '') : x}`) ? ' is-on' : '')}${btn(`data-item-play="${esc(type === 'syll' ? String(x).replace(/-/g, '') : x)}"`, 'השמעה', 'play')}` : '';
            return `<li class="scr-item scr-item--${type}" data-sort-group="xi:${key}:${n}"><button type="button" class="w-handle" data-drag aria-label="גרירה">${ICON.grip}</button><div class="scr-item__main"><input dir="ltr" data-item="${n}:${j}" value="${esc(x)}" placeholder="${esc(ph)}" aria-label="${one} ${j + 1}">${extra}</div>${rec}${btn(`data-arr-del="levels.list.${n}.items|${j}"`, 'מחיקה', 'trash', ' scr-hov')}</li>`;
          }).join('')}</ol>${addRow(`data-arr-add="levels.list.${n}.items" data-arr-new='""'`, one)}`;
          if (type === 'sent') {
            const hw = []; items.forEach((x) => words(x).forEach((w) => { if (hard.has(w.key) && !hw.includes(w.key)) hw.push(w.key); }));
            const noRec = hw.filter((w) => !ctx.urls.has(`word:${w}`)).length;
            if (hw.length) list += `<p class="scr-hardsum">מילים קשות: ${hw.map((w) => `<button type="button" data-hl="${esc(w)}">${esc(w)}</button>`).join(', ')}${noRec ? ` · ${noRec} בלי הקלטה` : ''}</p>`;
          }
        }
        return `<li class="scr-lv" data-sort-group="xl:${key}">
            <details${isOpen(key, `lv${n}`, L.list.length <= 3 || n === 0) ? ' open' : ''} data-sec="${key}|lv${n}">
              <summary><button type="button" class="w-handle" data-drag aria-label="גרירת ${esc(word)} ${n + 1}">${ICON.grip}</button><b>${esc(lv.name || `${word} ${n + 1}`)}</b><span class="scr-sec__sum" dir="auto">${esc(sum)}</span><span class="scr-sec__chev" aria-hidden="true"></span><span class="scr-lvmenu">${btn(`data-lv-menu="${n}"`, 'אפשרויות', 'dots')}</span></summary>
              <div class="scr-card__in">
                ${lv.instr != null ? `<label class="a-field"><span>הוראה ל${esc(word)} הזו</span><textarea rows="2" data-f="${key}|levels.list.${n}.instr">${esc(lv.instr)}</textarea></label>` : `<button type="button" class="scr-link" data-lv-instr="${n}">+ הוראה ל${esc(word)} הזו</button>`}
                ${list}
              </div>
            </details>
          </li>`;
      }).join('');
      if (type === 'letter') {
        const cur = Math.max(0, Math.min(stepOf.get(key) || 0, L.list.length - 1));
        const steps = L.list.map((lv, n) => `<button type="button" class="scr-step${n === cur ? ' is-cur' : ''}${lv.items.length ? '' : ' is-empty'}" data-lv-go="${n}" aria-label="${esc(word)} ${n + 1}" aria-pressed="${n === cur}"><span>${n + 1}</span></button>`).join('');
        const lv = L.list[cur];
        let panel = '<p class="scr-note">אין עדיין שלבים. מוסיפים שלב ראשון</p>';
        if (lv) {
          const box = document.createElement('div'); box.innerHTML = cards;
          const one = box.querySelectorAll('.scr-lv')[cur];
          const inner = one ? one.querySelector('.scr-card__in').innerHTML : '';
          panel = `<div class="scr-stepbox">
              <div class="scr-stepbox__h"><b>${esc(lv.name || `${word} ${cur + 1}`)}</b><span class="scr-sec__sum">${lv.items.length} אותיות</span><span class="scr-lvmenu">${btn(`data-lv-menu="${cur}"`, 'אפשרויות', 'dots')}</span></div>
              ${inner}
            </div>`;
        }
        return det(key, 'levels', 'השלבים', `${L.list.length} שלבים`, `
          <p class="a-help">כמו באתר: כל מספר הוא שלב. לוחצים על מספר כדי לערוך את האותיות שלו, ועל כרטיס כדי לשנות את האות או את התמונה</p>
          <div class="scr-steps">${steps}<button type="button" class="scr-step scr-step--add" data-lv-add aria-label="הוספת שלב" title="הוספת שלב">${ICON.plus}</button></div>
          ${panel}`, true);
      }
      return det(key, 'levels', 'הרמות', `${L.list.length} ${word === 'רמה' ? 'רמות' : word}`, `
          <div class="scr-lvset">
            ${field(key, 'levels.word', 'איך נקראת כל רמה', L.word, { ph: 'רמה' })}
            ${field(key, 'levels.title', 'הכותרת מעל המספרים', L.title, { ph: 'למשל: טורים' })}
            ${field(key, 'levels.visible', 'כמה מספרי רמות רואים בבת אחת', L.visible, { type: 'number', ph: '10' })}
          </div>
          <p class="a-help">${type === 'syll' ? 'מקף מפריד בין הברות. ההקלטה של מילה משותפת לכל המסכים' : type === 'sent' ? 'לחצו על מילה כדי לסמן אותה כקשה, והילד יוכל ללחוץ עליה ולשמוע אותה' : type === 'letter' ? 'לחיצה על כרטיס: עריכת האות והתמונה' : 'ההקלטה של מילה משותפת לכל המסכים'}</p>
          <ol class="scr-lvs">${cards}</ol>
          ${addRow('data-lv-add', `הוספת ${word}`)}`, true);
    }
    // a sentence's words: punctuation stays with the word but isn't part of it
    function words(sentence) {
      return String(sentence || '').split(/\s+/).filter(Boolean).map((t) => ({ text: t, key: t.toLowerCase().replace(/^[^a-z']+|[^a-z']+$/gi, '') })).filter((w) => w.key);
    }

    /* ---------- the preview ---------- */
    function preview(key, it, meta) {
      const m = view(it);
      const c = m.common;
      const z = m.zebra;
      const zsrc = z.media ? (ctx.urls.get(`zmedia:${z.media}`) || `assets/${z.media}`) : 'assets/zebra-hoop.webp';
      const zebra = isVideo(z.media) ? `<video src="${zsrc}" autoplay muted ${z.loop !== false ? 'loop' : ''} playsinline></video>` : `<img src="${zsrc}" alt="">`;
      let body = '';
      if (meta.kind === 'lessons') {
        body += `<div class="pv-zebra">${zebra}${z.says ? `<div class="pv-bubble">${z.boxTitle ? `<b>${esc(z.boxTitle)}</b>` : ''}${mdView(z.says)}<button type="button" class="pv-play" data-pv-say aria-label="השמעה">${ICON.play}</button></div>` : ''}</div>`;
      } else body += `<div class="pv-zebra pv-zebra--small">${zebra}</div>`;
      if (m.tabs) {
        const cur = pvTab.get(key) || 'discover';
        const t = m.tabs;
        const names = { discover: 'מגלים', build: 'מרכיבים', read: 'קוראים' };
        let inner = '';
        if (cur === 'discover') inner = `<p class="pv-h">${mdView(t.discover.title)}</p><div class="pv-cards">${t.discover.sounds.map((s) => `<span class="pv-card"><b>${esc(s[0])}</b></span>`).join('')}</div>${t.discover.bubble ? `<p class="pv-note">${mdView(t.discover.bubble)}</p>` : ''}`;
        if (cur === 'build') inner = `<p class="pv-h">${mdView(t.build.title)}</p><div class="pv-sum"><span class="pv-card"><b dir="ltr">${esc(t.build.letter)}</b><small>${mdView(t.build.shva)}</small></span><span>+</span><span class="pv-card"><small>${mdView(t.build.kamatz)}</small></span><span>=</span><span class="pv-card pv-card--pink"><b>${esc(t.build.result[0])}</b></span></div>`;
        if (cur === 'read') inner = `<ul class="pv-list">${t.read.lines.map((l) => `<li>${mdView(l)}</li>`).join('')}</ul><div class="pv-sum"><span class="pv-card"><b>${esc(t.read.compare[0])}</b></span><span>←</span><span class="pv-card"><b dir="ltr"><span class="pv-pink">${esc(t.read.compare[1])}</span><span class="pv-green">${esc(t.read.compare[2])}</span></b></span></div>`;
        body += `<div class="pv-tabs">${Object.entries(names).map(([id, n]) => `<button type="button" class="${id === cur ? 'is-on' : ''}" data-pv-go="${id}">${n}</button>`).join('')}</div><div class="pv-panel">${inner}</div>`;
      }
      if (m.extras) body += m.extras.map((x) => `<div class="pv-extra"><b>${esc(x.title || EXTRAS[x.type][0])}</b>${x.type === 'join' ? (x.rows || []).map((r) => `<p dir="ltr">${esc(r[0])} + ${esc(r[1])} = <b>${esc(r[2])}</b></p>`).join('') : x.type === 'ways' ? `<ul>${(x.lines || []).map((l) => `<li>${mdView(l)}</li>`).join('')}</ul>` : `<p>${mdView(x.text || '')}</p>`}</div>`).join('');
      if (m.song) body += `<div class="pv-abc">${m.song.letters.map((r) => `<span class="${r.t === '' || r.t == null ? 'is-none' : ''}">${esc(r.l)}</span>`).join('')}</div>`;
      if (m.levels) {
        const L = m.levels;
        const first = L.list[0] || { items: [] };
        const type = PRACTICE_T[it.template] || 'word';
        body += `${m.instr.hint ? `<p class="pv-h">${mdView(m.instr.hint)}</p>` : ''}${L.title ? `<p class="pv-small">${esc(L.title)}</p>` : ''}<div class="pv-steps">${L.list.slice(0, Number(L.visible) || 10).map((_, n) => `<span class="${n === 0 ? 'is-on' : ''}">${n + 1}</span>`).join('')}</div>
          <div class="pv-deck">${type === 'letter' ? first.items.slice(0, 1).map((l) => `<span class="pv-big"><img src="assets/cards/card-${esc(l.toLowerCase())}.webp" alt=""><b dir="ltr">${esc(l)}</b></span>`).join('') : `<span class="pv-big"><b dir="ltr">${type === 'syll' ? String(first.items[0] || '').split('-').map((p, q) => `<i class="c${q % 4}">${esc(p)}</i>`).join('') : esc(first.items[0] || '')}</b></span>`}</div>`;
      }
      return `<div class="pv">
          <p class="pv-red">${esc(c.red)}</p>
          <h3 class="pv-title">${esc(c.title || it.name || '')}</h3>
          ${c.empty ? '<p class="pv-empty">שלב ריק – התלמיד רואה רק את הכותרת והכפתורים</p>' : body}
          <span class="pv-btn">${esc(c.button || 'המשך')}</span>
        </div>`;
    }

    /* ---------- the whole screen ---------- */
    function render(key, it, meta) {
      meta.islandHasSong = ctx.islandHasSong();
      const parts = [detailsPart(key, it, meta), zebraPart(key, it, meta)];
      if (meta.kind === 'lessons') {
        if (it.template === 'הסבר בלשוניות') parts.push(tabsPart(key, it));
        else if (it.template === 'שיר האותיות') parts.push(songPart(key, it));
        else if (it.template === 'הסבר') parts.push(extrasPart(key, it));
        else parts.push(det(key, 'desc', 'התוכן של המסך', '', `<label class="a-field"><span>תיאור</span><textarea data-st-desc="${key}">${esc(it.desc || '')}</textarea></label>`, true));
      } else if (PRACTICE_T[it.template]) parts.push(instrPart(key, it, meta), levelsPart(key, it));
      else parts.push(det(key, 'desc', 'התוכן של המסך', '', `<p class="a-help">בוחרים תבנית ב"פרטי המסך" כדי לערוך את התוכן.</p><label class="a-field"><span>תיאור</span><textarea data-st-desc="${key}">${esc(it.desc || '')}</textarea></label>`, true));
      return `<div class="scr" data-scr="${key}">
          <div class="scr__form">${parts.join('')}</div>
          <aside class="scr__pv" aria-label="תצוגה מקדימה"><div class="scr__pvhead"><b>תצוגה מקדימה</b><button type="button" class="scr-link scr__pvclose" data-pv-close>סגירה</button></div><div data-pv>${preview(key, it, meta)}</div></aside>
        </div>`;
    }

    /* ---------- changes ---------- */
    const keyOf = (el) => { const s = el.closest('[data-scr]'); return s ? s.dataset.scr : null; };
    let lastMeta = null;
    const part = (key) => ctx.part(key);
    function refreshPreview(key) {
      const box = ctx.root.querySelector(`[data-scr="${key}"] [data-pv]`);
      const it = part(key);
      if (box && it && lastMeta) box.innerHTML = preview(key, it, lastMeta);
    }
    function touched(key, redraw) { ctx.changed(); if (redraw) ctx.redraw(); else refreshPreview(key); }
    function set(key, path, v, redraw) { const it = part(key); setPath(ensure(it), path, v); touched(key, redraw); }
    // a drag, a delete of a word / level when children already started: ask first
    function guard(key, then) {
      const n = ctx.started(part(key));
      if (!n) { then(); return; }
      UI.confirm({ title: `${n} ילדים כבר התחילו את התרגול. השינוי עלול לאפס את הסימונים שלהם.`, ok: 'המשך', cancel: 'ביטול' }, then);
    }
    // the engine's drag / keyboard moves, for the lists here
    function move(g, from, to) {
      const [kind, key, a] = (() => { const p = g.split(':'); return [p[0], p.slice(1, 4).join(':'), p[4]]; })();
      const it = part(key);
      const m = ensure(it);
      const mv = (arr) => { const [x] = arr.splice(from, 1); arr.splice(to, 0, x); };
      const doIt = () => {
        if (kind === 'xl') mv(m.levels.list);
        else if (kind === 'xi') mv(m.levels.list[Number(a)].items);
        else if (kind === 'xs') mv(m.song.letters);
        else if (kind === 'xt') mv(m.tabs.discover.sounds);
        else if (kind === 'xr') mv(m.tabs.read.lines);
        else if (kind === 'xe') mv(m.extras);
        else if (kind === 'xj') mv(m.extras[Number(a)].rows);
        else if (kind === 'xw') mv(m.extras[Number(a)].lines);
        touched(key, true);
      };
      if (kind === 'xl' || kind === 'xi') guard(key, doIt); else doIt();
    }

    function wire() {
      const root = ctx.root;
      root.addEventListener('mousedown', (e) => { if (e.target.closest('[data-rt-cmd]')) e.preventDefault(); });
      root.addEventListener('input', (e) => {
        const t = e.target;
        const key = keyOf(t);
        if (!key) return;
        if (t.dataset.rt) { const [k, path] = t.dataset.rt.split('|'); set(k, path, htmlToMd(t)); return; }
        if (t.dataset.f) { const [k, path] = t.dataset.f.split('|'); set(k, path, t.value); return; }
        if (t.dataset.item) { const [n, j] = t.dataset.item.split(':').map(Number); const it = part(key); ensure(it).levels.list[n].items[j] = t.value.trim(); ctx.changed(); const row = t.closest('.scr-item'); const ex = row.querySelector('.scr-syl, .scr-words'); if (ex) { const tmp = document.createElement('div'); tmp.innerHTML = levelsPart(key, it); const fresh = tmp.querySelector(`[data-item="${n}:${j}"]`); const nx = fresh && fresh.parentElement.querySelector('.scr-syl, .scr-words'); if (nx) ex.replaceWith(nx); } refreshPreview(key); return; }
        if (t.dataset.songT != null) return; // on change
        if (t.matches('[data-st-name]')) refreshPreview(key);
      });
      root.addEventListener('change', (e) => {
        const t = e.target;
        const key = keyOf(t);
        if (!key) return;
        const it = part(key);
        if (t.dataset.fc) { const [k, path] = t.dataset.fc.split('|'); set(k, path, t.checked, true); return; }
        if (t.dataset.songT != null) { ensure(it).song.letters[Number(t.dataset.songT)].t = parseT(t.value); touched(key, true); return; }
        const f = t.files && t.files[0];
        if (!f) return;
        if (t.matches('[data-zmedia]')) { const name = f.name; ctx.urls.set(`zmedia:${name}`, URL.createObjectURL(f)); const m = ensure(it); m.zebra.media = name; touched(key, true); return; }
        if (t.dataset.voiceFile) { ctx.urls.set(`voice:${key}:${t.dataset.voiceFile}`, URL.createObjectURL(f)); const m = ensure(it); setPath(m, `${t.dataset.voiceFile === 'zebra' ? 'zebra' : 'instr'}.voice`, f.name); touched(key, true); return; }
        if (t.matches('[data-song-file]')) {
          const m = ensure(it);
          const hadTimes = m.song.letters.some((r) => r.t !== '' && r.t != null);
          ctx.urls.set(`song:${key}`, URL.createObjectURL(f));
          m.song.fileName = f.name; m.song.file = '';
          durations.delete(key);
          touched(key, true);
          if (hadTimes) UI.confirm({ title: 'הזמנים שסומנו לא יתאימו לשיר החדש. לאפס אותם?', ok: 'איפוס זמנים', cancel: 'השארה' }, () => { m.song.letters.forEach((r) => { r.t = ''; }); touched(key, true); });
          return;
        }
        if (t.dataset.lpic) { const l = t.dataset.lpic; ctx.urls.set(`pic:${l}`, URL.createObjectURL(f)); const m = ensure(it); m.levels = m.levels || {}; m.levels.pics = m.levels.pics || {}; m.levels.pics[l] = f.name; closePop(); touched(key, true); }
        if (t.dataset.wfile) { ctx.urls.set(`word:${t.dataset.wfile}`, URL.createObjectURL(f)); closePop(); touched(key, true); }
      });
      root.addEventListener('toggle', (e) => {
        const d = e.target;
        if (!d.dataset || !d.dataset.sec) return;
        open.set(d.dataset.sec, d.open);
        if (d.open && d.dataset.pvTab) { const key = d.dataset.sec.split('|')[0]; pvTab.set(key, d.dataset.pvTab); refreshPreview(key); }
      }, true);
      root.addEventListener('keydown', (e) => {
        const t = e.target;
        const key = keyOf(t);
        if (mark && (e.key === ' ' || e.key === 'Escape') && !t.matches('input, textarea, [contenteditable]')) { e.preventDefault(); if (e.key === ' ') stamp(mark.key); else stopMark(); return; }
        if (!key) return;
        if (t.dataset.item && e.key === 'Enter') { e.preventDefault(); const [n, j] = t.dataset.item.split(':').map(Number); const m = ensure(part(key)); if (j === m.levels.list[n].items.length - 1) { m.levels.list[n].items.push(''); touched(key, true); focus(`[data-item="${n}:${j + 1}"]`); } else focus(`[data-item="${n}:${j + 1}"]`); return; }
        if (t.dataset.addLetter != null && e.key === 'Enter') { e.preventDefault(); const v = t.value.trim(); if (!v) return; const n = Number(t.dataset.addLetter); ensure(part(key)).levels.list[n].items.push(v); touched(key, true); focus(`[data-add-letter="${n}"]`); return; }
        if (t.dataset.addLetter != null && e.key === 'Escape') { closePop(); ctx.redraw(); }
        if (t.dataset.rt && t.getAttribute('aria-multiline') === 'false' && e.key === 'Enter') e.preventDefault();
      });
      root.addEventListener('click', (e) => {
        const t = e.target;
        const key = keyOf(t);
        if (!key) return;
        const it = part(key);
        const q = (a) => { const b = t.closest(`[${a}]`); return b ? b.getAttribute(a) : null; };
        let v;
        if ((v = q('data-rt-cmd'))) { const ed = t.closest('.rt').querySelector('[data-rt]'); applyMark(ed, v); return; }
        if (t.closest('summary') && t.closest('button, input')) e.preventDefault();
        if ((v = q('data-arr-add')) != null) { const m = ensure(it); const arr = getPath(m, v) || (setPath(m, v, []), getPath(m, v)); arr.push(JSON.parse(t.closest('[data-arr-new]').dataset.arrNew)); touched(key, true); return; }
        if ((v = q('data-arr-del')) != null) { const [path, j] = v.split('|'); const doIt = () => { const arr = getPath(ensure(it), path); arr.splice(Number(j), 1); touched(key, true); }; if (path.startsWith('levels.')) guard(key, doIt); else doIt(); return; }
        if (t.closest('[data-show-reads]')) { set(key, 'zebra.showReads', true, true); focus(`[data-f="${key}|zebra.reads"]`); return; }
        if (t.closest('[data-zmedia-del]')) { set(key, 'zebra.media', null, true); return; }
        if (t.closest('[data-zlib]')) { openLib(key, t.closest('[data-zlib]')); return; }
        if ((v = q('data-zpick'))) { set(key, 'zebra.media', v, true); closePop(); return; }
        if ((v = q('data-voice-rec'))) { record(t.closest('button'), (blob) => { ctx.urls.set(`voice:${key}:${v}`, URL.createObjectURL(blob)); setPath(ensure(it), `${v === 'zebra' ? 'zebra' : 'instr'}.voice`, 'הקלטה'); touched(key, true); }); return; }
        if ((v = q('data-voice-play'))) { const u = ctx.urls.get(`voice:${key}:${v}`); const m = view(it); if (u) new Audio(u).play(); else speak(v === 'zebra' ? (m.zebra.reads || m.zebra.says) : m.instr.says, 'he-IL'); return; }
        if ((v = q('data-voice-del'))) { ctx.urls.delete(`voice:${key}:${v}`); setPath(ensure(it), `${v === 'zebra' ? 'zebra' : 'instr'}.voice`, ''); touched(key, true); return; }
        if (t.closest('[data-pv-say]')) { const m = view(it); const u = ctx.urls.get(`voice:${key}:zebra`); if (u) new Audio(u).play(); else speak(m.zebra.reads || m.zebra.says, 'he-IL'); return; }
        if ((v = q('data-pv-go'))) { pvTab.set(key, v); refreshPreview(key); return; }
        if ((v = q('data-say-path'))) { speak(getPath(view(it), v)); return; }
        if ((v = q('data-extra-menu')) != null) { const mn = t.closest('.scr-addmenu').querySelector('.scr-menu'); mn.hidden = !mn.hidden; return; }
        if ((v = q('data-extra-add'))) { const m = ensure(it); const x = { type: v, title: EXTRAS[v][0] }; if (v === 'join') x.rows = [['b', 'a', 'ba']]; else if (v === 'ways') x.lines = ['']; else x.text = ''; m.extras.push(x); open.set(`${key}|ex${m.extras.length - 1}`, true); touched(key, true); return; }
        if (t.closest('[data-lv-add]')) { const m = ensure(it); m.levels.list.push({ name: '', instr: null, items: [] }); open.set(`${key}|lv${m.levels.list.length - 1}`, true); stepOf.set(key, m.levels.list.length - 1); touched(key, true); return; }
        if ((v = q('data-lv-instr')) != null) { ensure(it).levels.list[Number(v)].instr = ''; touched(key, true); focus(`[data-f="${key}|levels.list.${v}.instr"]`); return; }
        if ((v = q('data-lv-go')) != null) { stepOf.set(key, Number(v)); ctx.redraw(); return; }
        if ((v = q('data-lv-menu')) != null) { e.preventDefault(); lvMenu(key, Number(v), t.closest('button')); return; }
        if ((v = q('data-lv-dup')) != null) { const m = ensure(it); const n = Number(v); m.levels.list.splice(n + 1, 0, clone(m.levels.list[n])); closePop(); touched(key, true); return; }
        if ((v = q('data-lv-del')) != null) { closePop(); guard(key, () => { ensure(it).levels.list.splice(Number(v), 1); touched(key, true); }); return; }
        if ((v = q('data-add-letter-open')) != null) { pop = { type: 'addLetter', key, n: Number(v) }; ctx.redraw(); focus(`[data-add-letter="${v}"]`); return; }
        if ((v = q('data-slt-menu')) != null) { songLetterPop(key, it, Number(v), t.closest('[data-slt-menu]')); return; }
        if ((v = q('data-lcard'))) { letterPop(key, it, v, t.closest('[data-lcard]')); return; }
        if ((v = q('data-lpic-auto'))) { const m = ensure(it); delete ((m.levels || {}).pics || {})[v]; closePop(); touched(key, true); return; }
        if ((v = q('data-hard'))) { const m = ensure(it); const h = new Set(m.levels.hard || []); if (h.has(v)) h.delete(v); else h.add(v); m.levels.hard = [...h]; touched(key, true); return; }
        if ((v = q('data-wpop'))) { wordPop(key, v, t.closest('[data-wpop]')); return; }
        if ((v = q('data-wplay'))) { const u = ctx.urls.get(`word:${v}`); if (u) new Audio(u).play(); else speak(v); return; }
        if ((v = q('data-wrec'))) { record(t.closest('button'), (blob) => { ctx.urls.set(`word:${v}`, URL.createObjectURL(blob)); closePop(); touched(key, true); }); return; }
        if ((v = q('data-wdel'))) { ctx.urls.delete(`word:${v}`); closePop(); touched(key, true); return; }
        if ((v = q('data-hl'))) { root.querySelectorAll(`[data-scr="${key}"] .scr-w`).forEach((w) => w.classList.toggle('is-hl', w.dataset.w === v)); return; }
        if ((v = q('data-item-rec'))) { record(t.closest('button'), (blob) => { ctx.urls.set(`word:${v}`, URL.createObjectURL(blob)); touched(key, true); }); return; }
        if ((v = q('data-item-play'))) { const u = ctx.urls.get(`word:${v}`); if (u) new Audio(u).play(); else speak(v); return; }
        // the song
        const au = root.querySelector(`[data-scr="${key}"] [data-song-el]`);
        if (t.closest('[data-song-del]')) { ctx.urls.delete(`song:${key}`); const m = ensure(it); m.song.file = ''; m.song.fileName = ''; touched(key, true); return; }
        if (t.closest('[data-song-toggle]') && au) { if (au.paused) au.play(); else au.pause(); return; }
        if ((v = q('data-song-stamp')) != null && au) { ensure(it).song.letters[Number(v)].t = Math.round(au.currentTime * 10) / 10; touched(key, true); return; }
        if ((v = q('data-song-play')) != null && au) { const r = view(it).song.letters[Number(v)]; if (r.t === '' || r.t == null) return; au.currentTime = Number(r.t); au.play(); return; }
        if (t.closest('[data-song-abc]')) { const m = ensure(it); const have = new Set(m.song.letters.map((r) => (r.l || '').toLowerCase())); 'abcdefghijklmnopqrstuvwxyz'.split('').forEach((l) => { if (!have.has(l)) m.song.letters.push({ l, t: '' }); }); touched(key, true); return; }
        if (t.closest('[data-mark-start]') && au) { mark = { key }; au.currentTime = 0; au.play(); ctx.redraw(); return; }
        if (t.closest('[data-mark-now]')) { stamp(key); return; }
        if (t.closest('[data-mark-stop]')) { stopMark(); return; }
        if (t.closest('[data-pv-eye]')) { const sc = root.querySelector(`[data-scr="${key}"]`); sc.classList.toggle('is-pv'); return; }
        if (t.closest('[data-pv-close]')) { t.closest('[data-scr]').classList.remove('is-pv'); }
      });
      // the song's player: time, progress, markers you can drag
      root.addEventListener('loadedmetadata', (e) => { const a = e.target; if (!a.matches || !a.matches('[data-song-el]')) return; const key = keyOf(a); if (key && Number.isFinite(a.duration) && durations.get(key) !== a.duration) { durations.set(key, a.duration); ctx.redraw(); } }, true);
      root.addEventListener('timeupdate', (e) => {
        const a = e.target; if (!a.matches || !a.matches('[data-song-el]')) return;
        const box = a.closest('[data-scr]'); if (!box) return;
        const tEl = box.querySelector('[data-song-time]'); const p = box.querySelector('[data-song-prog]');
        const d = a.duration || 0;
        if (tEl) tEl.textContent = `${fmtT(a.currentTime).replace(/\.\d$/, '')} / ${d ? fmtT(d).replace(/\.\d$/, '') : '–'}`;
        if (p && d) p.style.width = `calc(14px + (100% - 28px) * ${a.currentTime / d})`;
        const tg = box.querySelector('[data-song-toggle]'); if (tg) tg.innerHTML = a.paused ? ICON.play : ICON.pause;
      }, true);
      ['play', 'pause'].forEach((ev) => root.addEventListener(ev, (e) => { const a = e.target; if (!a.matches || !a.matches('[data-song-el]')) return; const tg = a.closest('[data-scr]').querySelector('[data-song-toggle]'); if (tg) tg.innerHTML = a.paused ? ICON.play : ICON.pause; }, true));
      let markDrag = null;
      root.addEventListener('pointerdown', (e) => {
        const mk = e.target.closest('[data-mark]'); const line = e.target.closest('[data-song-line]');
        if (!line) return;
        const key = keyOf(line); const a = line.closest('[data-scr]').querySelector('[data-song-el]'); const d = durations.get(key);
        if (!a || !d) return;
        const at = (x) => { const r = line.getBoundingClientRect(); return Math.max(0, Math.min(1, (r.right - 14 - x) / (r.width - 28))) * d; };
        if (mk) { e.preventDefault(); markDrag = { key, n: Number(mk.dataset.mark), el: mk, at }; mk.setPointerCapture(e.pointerId); }
        else a.currentTime = at(e.clientX);
      });
      root.addEventListener('pointermove', (e) => { if (!markDrag) return; const t = Math.round(markDrag.at(e.clientX) * 10) / 10; const d = durations.get(markDrag.key); markDrag.el.style.right = `calc(14px + (100% - 28px) * ${t / d})`; markDrag.t = t; });
      root.addEventListener('pointerup', () => { if (!markDrag) return; const md = markDrag; markDrag = null; if (md.t != null) { ensure(part(md.key)).song.letters[md.n].t = md.t; touched(md.key, true); } });
      document.addEventListener('click', (e) => { if (pop && pop.el && !pop.el.contains(e.target) && !e.target.closest('[data-lcard],[data-slt-menu],[data-wpop],[data-lv-menu],[data-zlib],[data-add-letter-open],[data-add-letter]')) closePop(); });
    }
    function stamp(key) {
      const it = part(key); const a = ctx.root.querySelector(`[data-scr="${key}"] [data-song-el]`);
      if (!a) return;
      const m = ensure(it);
      const n = m.song.letters.findIndex((r) => r.t === '' || r.t == null);
      if (n < 0) { stopMark(); return; }
      m.song.letters[n].t = Math.round(a.currentTime * 10) / 10;
      ctx.changed(); ctx.redraw();
      const a2 = ctx.root.querySelector(`[data-scr="${key}"] [data-song-el]`);
      if (a2 && a2 !== a) { a2.currentTime = a.currentTime; a2.play(); }
      if (m.song.letters.findIndex((r) => r.t === '' || r.t == null) < 0) stopMark();
    }
    function stopMark() { if (!mark) return; const a = ctx.root.querySelector(`[data-scr="${mark.key}"] [data-song-el]`); if (a) a.pause(); mark = null; ctx.redraw(); }
    const focus = (sel) => setTimeout(() => { const f = ctx.root.querySelector(sel); if (f) { f.focus(); if (f.select) f.select(); } }, 0);
    function record(b, done) {
      if (window.__scrRec) { window.__scrRec.stop(); return; }
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const rec = new MediaRecorder(stream); const chunks = [];
        rec.ondataavailable = (ev) => chunks.push(ev.data);
        rec.onstop = () => { stream.getTracks().forEach((tr) => tr.stop()); window.__scrRec = null; done(new Blob(chunks, { type: rec.mimeType })); };
        window.__scrRec = rec; rec.start(); if (b) b.classList.add('is-rec');
      }).catch(() => alert('אין גישה למיקרופון'));
    }
    // small popovers: the zebra library, a letter card, a hard word, a level's ⋯
    function showPop(anchor, html, cls = '') {
      closePop();
      const el = document.createElement('div');
      el.className = `scr-pop ${cls}`;
      el.innerHTML = html;
      anchor.closest('[data-scr]').appendChild(el);
      const r = anchor.getBoundingClientRect(); const pr = el.offsetParent.getBoundingClientRect();
      el.style.top = `${r.bottom - pr.top + 6}px`;
      el.style.left = `${Math.max(8, r.left - pr.left + r.width - el.offsetWidth)}px`;
      pop = { el };
      const f = el.querySelector('input, button'); if (f) f.focus();
    }
    function closePop() { if (pop && pop.el) pop.el.remove(); pop = null; }
    function openLib(key, anchor) {
      const used = new Set(ZEBRAS);
      ctx.zebraLibrary().forEach((n) => used.add(n));
      showPop(anchor, `<p class="scr-pop__h">בחירה מזברות קיימות</p><div class="scr-zlib">${[...used].map((n) => { const u = ctx.urls.get(`zmedia:${n}`) || `assets/${n}`; return `<button type="button" data-zpick="${esc(n)}" title="${esc(n)}">${isVideo(n) ? `<video src="${u}" muted autoplay loop playsinline></video>` : `<img src="${u}" alt="">`}</button>`; }).join('')}</div>`, 'scr-pop--lib');
    }
    function letterPop(key, it, v, anchor) {
      const [n, j] = v.split(':').map(Number);
      const l = view(it).levels.list[n].items[j];
      const custom = !!(view(it).levels.pics || {})[l];
      showPop(anchor, `<label class="a-field"><span>האות</span><input dir="ltr" maxlength="3" data-f="${key}|levels.list.${n}.items.${j}" value="${esc(l)}"></label>
          <div class="scr-pop__row"><label class="scr-link">החלפת התמונה<input class="sr-only" type="file" accept="image/*" data-lpic="${esc(l)}"></label>${custom ? `<button type="button" class="scr-link" data-lpic-auto="${esc(l)}">חזרה לתמונה האוטומטית</button>` : ''}</div>`);
      pop.el.addEventListener('change', () => ctx.redraw(), { once: true });
    }
    function songLetterPop(key, it, n, anchor) {
      const l = view(it).song.letters[n].l || '';
      const custom = !!((view(it).levels || {}).pics || {})[l];
      showPop(anchor, `<div class="scr-pop__col">${l ? `<label>${ICON.img} החלפת התמונה<input class="sr-only" type="file" accept="image/*" data-lpic="${esc(l)}"></label>` : ''}${custom ? `<button type="button" data-lpic-auto="${esc(l)}">${ICON.img} חזרה לתמונה האוטומטית</button>` : ''}<button type="button" class="scr-pop__del" data-arr-del="song.letters|${n}">${ICON.trash} מחיקת האות</button></div>`, 'scr-pop--menu');
    }
    function wordPop(key, w, anchor) {
      const has = ctx.urls.has(`word:${w}`);
      showPop(anchor, `<p class="scr-pop__h" dir="ltr">${esc(w)}</p><div class="scr-pop__col"><button type="button" data-wplay="${esc(w)}">${ICON.play} השמעה</button><button type="button" data-wrec="${esc(w)}">${ICON.mic} הקלטה</button><label>${ICON.up} העלאת קובץ<input class="sr-only" type="file" accept="audio/*" data-wfile="${esc(w)}"></label>${has ? `<button type="button" class="w-more__danger" data-wdel="${esc(w)}">מחיקת הקלטה</button>` : ''}</div>`);
    }
    function lvMenu(key, n, anchor) {
      showPop(anchor, `<div class="scr-pop__col"><button type="button" data-lv-dup="${n}">שכפול</button><button type="button" class="w-more__danger" data-lv-del="${n}">מחיקה</button></div>`);
    }

    return {
      render(key, it, meta) { lastMeta = meta; return render(key, it, meta); },
      preview(key, it, meta) { lastMeta = meta; return preview(key, it, meta); },
      hasContent,
      view,
      wire,
      move,
      isLocal: (g) => /^x[a-z]:/.test(g),
    };
  };
})();
