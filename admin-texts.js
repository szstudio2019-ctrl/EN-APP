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

  box.addEventListener('input', (e) => {
    const path = e.target.dataset.path;
    if (!path) return;
    const p = path.split('.');
    if (p.length === 3) cur[p[0]][Number(p[1])][p[2]] = e.target.value; else cur[path] = e.target.value;
    if (P.preview) document.getElementById('t-preview').innerHTML = P.preview(cur, UI.esc);
    changed();
  });
  box.addEventListener('click', (e) => {
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
  draw();
})();
