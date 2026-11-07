// Admin – text pages (the site explanation, the about page): a form built from
// the page's description (window.TEXT_PAGE: key, sections → fields; a section
// may be a list of cards, each card the same fields). The texts are kept in
// this browser (demo) under en-app:admin-<key>; the save bar keeps or drops changes.
(function () {
  const { UI } = window.Admin;
  const P = window.TEXT_PAGE;
  const KEY = `en-app:admin-${P.key}`;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
  const clone = (v) => JSON.parse(JSON.stringify(v));
  let saved = Object.assign(clone(P.defaults), read() || {});
  let cur = clone(saved);
  const box = document.getElementById('t-form');

  const field = (id, f, v) => {
    if (f.image) {
      return `<div class="a-field t-wide"><span>${f.label}</span>
        <div class="t-img">
          <label class="t-img__pic" for="${id}" aria-label="בחירת תמונה">${v ? `<img src="${v}" alt="">` : '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="9" r="1.5"/></svg>'}</label>
          <div class="t-img__btns">
            <label class="a-btn a-btn--ghost" for="${id}">${v ? 'החלפת תמונה' : 'הוספת תמונה'}</label>
            ${v ? `<button class="u-editor__link u-editor__link--muted t-img__del" type="button" data-img-del="${id}">הסרה</button>` : ''}
            <small class="a-help" style="display:block">${f.help || 'לא חובה · PNG או WEBP'}</small>
          </div>
          <input id="${id}" data-img="${id}" type="file" accept="image/*" class="sr-only">
        </div></div>`;
    }
    const input = f.long
      ? `<textarea id="${id}" data-path="${id}">${UI.esc(v || '')}</textarea>`
      : `<input id="${id}" data-path="${id}" value="${UI.esc(v || '')}"${f.ltr ? ' dir="ltr"' : ''}>`;
    return `<label class="a-field${f.wide ? ' t-wide' : ''}"><span>${f.label}</span>${input}${f.help ? `<small class="a-help">${f.help}</small>` : ''}</label>`;
  };

  function draw() {
    box.innerHTML = P.sections.map((s) => {
      if (s.list) {
        const items = cur[s.list] || [];
        return `<section class="a-card t-sec" aria-labelledby="t-${s.list}">
          <h2 class="t-h" id="t-${s.list}">${s.title}</h2>
          ${s.note ? `<p class="a-help t-note">${s.note}</p>` : ''}
          <ol class="t-items">${items.map((it, k) => `<li class="t-item">
            <div class="t-item__head"><b>${s.itemName} ${k + 1}</b>
              <span class="t-item__tools">
                <button class="t-round" type="button" data-up="${s.list}:${k}" aria-label="הזזה למעלה"${k === 0 ? ' disabled' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></button>
                <button class="t-round" type="button" data-down="${s.list}:${k}" aria-label="הזזה למטה"${k === items.length - 1 ? ' disabled' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
                ${s.fixed ? '' : `<button class="t-round t-round--del" type="button" data-del="${s.list}:${k}" aria-label="מחיקת ${s.itemName} ${k + 1}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3"/></svg></button>`}
              </span>
            </div>
            <div class="t-grid">${s.fields.map((f) => field(`${s.list}.${k}.${f.key}`, f, it[f.key])).join('')}</div>
          </li>`).join('')}</ol>
          ${s.fixed ? '' : `<button class="a-btn a-btn--ghost t-add" type="button" data-add="${s.list}">+ הוספת ${s.itemName}</button>`}
        </section>`;
      }
      return `<section class="a-card t-sec" aria-labelledby="t-${s.id}">
        <h2 class="t-h" id="t-${s.id}">${s.title}</h2>
        ${s.note ? `<p class="a-help t-note">${s.note}</p>` : ''}
        <div class="t-grid">${s.fields.map((f) => field(f.key, f, cur[f.key])).join('')}</div>
      </section>`;
    }).join('');
    if (P.preview) document.getElementById('t-preview').innerHTML = P.preview(cur, UI.esc);
  }

  const bar = UI.saveBar({
    onSave: () => { saved = clone(cur); try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { /* blocked */ } },
    onCancel: () => { cur = clone(saved); draw(); },
  });
  document.querySelector('.a-head').appendChild(bar.el);
  const changed = () => bar.setDirty(JSON.stringify(cur) !== JSON.stringify(saved));

  const setAt = (path, v) => { const p = path.split('.'); if (p.length === 3) cur[p[0]][Number(p[1])][p[2]] = v; else cur[path] = v; };
  box.addEventListener('change', (e) => {
    const path = e.target.dataset.img;
    const file = path && e.target.files && e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const W = Math.min(600, img.width), H = Math.round(img.height * (W / img.width));
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      c.getContext('2d').drawImage(img, 0, 0, W, H);
      setAt(path, c.toDataURL('image/webp', 0.85));
      URL.revokeObjectURL(url);
      draw(); changed();
    };
    img.src = url;
  });
  box.addEventListener('input', (e) => {
    const path = e.target.dataset.path;
    if (!path) return;
    setAt(path, e.target.value);
    if (P.preview) document.getElementById('t-preview').innerHTML = P.preview(cur, UI.esc);
    changed();
  });
  box.addEventListener('click', (e) => {
    const del = e.target.closest('[data-img-del]');
    if (del) { setAt(del.dataset.imgDel, ''); draw(); changed(); return; }
    const b = e.target.closest('[data-up],[data-down],[data-del],[data-add]');
    if (!b) return;
    if (b.dataset.add) {
      const s = P.sections.find((x) => x.list === b.dataset.add);
      cur[s.list].push(Object.fromEntries(s.fields.map((f) => [f.key, ''])));
      draw(); changed();
      const items = box.querySelectorAll(`[data-path^="${s.list}.${cur[s.list].length - 1}."]`);
      if (items[0]) items[0].focus();
      return;
    }
    const [list, k] = (b.dataset.up || b.dataset.down || b.dataset.del).split(':');
    const arr = cur[list];
    const i = Number(k);
    if (b.dataset.del) {
      if (!confirm('למחוק את הפריט הזה?')) return;
      arr.splice(i, 1);
    } else {
      const j = b.dataset.up ? i - 1 : i + 1;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    draw(); changed();
  });
  // the preview's own buttons (the intro's slides) redraw it
  window.__pvDraw = () => { if (P.preview) document.getElementById('t-preview').innerHTML = P.preview(cur, UI.esc); };
  // full width, two tabs on top: editing and viewing
  const layout = box.closest('.t-layout');
  const side = layout.querySelector('.t-side');
  const tabs = document.createElement('div');
  tabs.className = 't-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.innerHTML = `<button type="button" role="tab" data-tab="edit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>עריכה</button>
    <button type="button" role="tab" data-tab="view"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>צפייה</button>`;
  layout.before(tabs);
  layout.classList.add('is-tabs');
  const showTab = (k) => {
    tabs.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === k)));
    layout.dataset.tab = k;
    box.hidden = k !== 'edit';
    side.hidden = k === 'edit' && !P.split;
    layout.classList.toggle('is-split', k === 'edit' && !!P.split);
    window.__pvDraw();
  };
  tabs.addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab); });
  showTab('edit');
  draw();
})();
