// Trophy bubble: the hidden sentence and "draw another sentence".
// Demo sentences for now; letters the learner has already found are shown,
// the rest are "?". Shared by every page.
(function () {
  const SENTENCES = [
    { words: ['bunny', 'in', 'yard'], found: 'bny' },
    { words: ['the', 'cat', 'is', 'big'], found: 'tca' },
    { words: ['i', 'can', 'swim'], found: 'is' },
    { words: ['a', 'red', 'apple'], found: 'ap' },
    { words: ['my', 'dog', 'runs'], found: 'mdr' },
  ];
  const box = document.querySelector('.trophy-hint .sentence');
  const btn = document.querySelector('.trophy-hint__redraw');
  if (!box || !btn) return;

  let index = 0;
  function show(s) {
    // reveal each found letter once, at its first place in the sentence
    const left = s.found.split('');
    box.innerHTML = s.words.map((word) => `<span class="sentence__word">${
      word.split('').map((ch) => {
        const at = left.indexOf(ch);
        if (at >= 0) { left.splice(at, 1); return `<b class="tile is-found">${ch}</b>`; }
        return '<b class="tile">?</b>';
      }).join('')
    }</span>`).join('');
    box.setAttribute('aria-label', `המשפט: ${s.found.split('').join(', ')} נמצאו`);
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation(); // keep the bubble open
    index = (index + 1) % SENTENCES.length;
    box.classList.remove('is-drawing');
    box.offsetWidth;
    box.classList.add('is-drawing');
    setTimeout(() => show(SENTENCES[index]), 250); // swap at the middle of the flip
  });
})();
