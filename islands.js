// Shared island list for every page (map, island pages and the side menu).
(function () {
  // Course order from Figma ("Group 1261154890"). `box` is where the artwork sits
  // inside the 556x497 island frame (left, top, width, height), as in the design.
  // Islands without artwork (img: null) get a simple placeholder island.
  // `status` is the learner's progress (demo values): 'done', 'progress' (with
  // `progress` %), or locked when omitted. Locked islands stay locked even while
  // the learner scrolls past them to look.
  window.ISLANDS = [
    { name: 'אי זיהוי האותיות', lessons: '1', img: 'island-abc', box: [0, 0, 568, 476.6], status: 'done', page: 'letters.html',
      about: { title: 'נכיר את האותיות!', text: 'בעולם הזה נפגוש את כל האותיות באנגלית ונלמד לזהות אותן. (טקסט דמו)' } },
    { name: 'אי האותיות של רופא/ה', lessons: '2-4', img: 'island-doctor-still', box: [11, -5, 564, 501], video: 'island-doctor-ahh', videoBox: [11, -5, 564, 501], sound: 'doctor-ahh', status: 'progress', progress: 50, page: 'doctor.html',
      about: {
        title: 'האות a היא הרופא/ה!',
        text: 'בעולם הזה נכיר את האות a – שאומרת לאות שלפניה להגיד אַה, כמו אצל הרופא/ה.',
      } },
    { name: 'אי האותיות המחייכות', page: 'smiles.html', lessons: '5-11', img: 'island-smiles', box: [21, 27, 529, 423],
      about: { title: 'האותיות המחייכות', text: 'כאן נכיר אותיות שמחות שמשנות את הצליל של המילה. (טקסט דמו)' } },
    { name: 'אי החזרות', page: 'review.html?r=1-10', review: '1-10', img: 'island-review', box: [32, -14, 504, 504], status: 'done', earned: 520,
      about: { title: 'זמן לחזרה!', text: 'חוזרים על מה שלמדנו, צוברים תרגולים ומקבלים פרסים. (טקסט דמו)' } },
    { name: 'אי האותיות הבודדות', page: 'single.html', lessons: '11-16', img: 'island-single', box: [49, 0, 493, 493],
      about: { title: 'האותיות הבודדות', text: 'אותיות שאוהבות לעמוד לבד – ונלמד איך הן נשמעות. (טקסט דמו)' } },
    { name: 'אי החזרות', page: 'review.html?r=1-16', review: '1-16', img: 'island-review', box: [32, -14, 504, 504], status: 'progress', progress: 40, earned: 180,
      about: { title: 'זמן לחזרה!', text: 'חוזרים על מה שלמדנו, צוברים תרגולים ומקבלים פרסים. (טקסט דמו)' } },
    { name: 'אי צירוף האותיות', page: 'blending.html', lessons: '17-21', img: 'island-blending', box: [0, 48, 557, 371],
      about: { title: 'מחברים אותיות', text: 'נחבר אותיות למילים קצרות ונקרא אותן יחד. (טקסט דמו)' } },
    { name: 'אי החזרות', page: 'review.html?r=1-21', review: '1-21', img: 'island-review', box: [32, -14, 504, 504],
      about: { title: 'זמן לחזרה!', text: 'חוזרים על מה שלמדנו, צוברים תרגולים ומקבלים פרסים. (טקסט דמו)' } },
    { name: 'אי האותיות השורקות', page: 'whistling.html', lessons: '22-25', img: 'island-whistling', box: [7, 17, 528, 434], flip: true,
      about: { title: 'האותיות השורקות', text: 'ששש... אותיות שעושות צליל של רוח ושריקה. (טקסט דמו)' } },
    { name: 'אי הקסמים', page: 'magic.html', lessons: '26-34', img: 'island-magic', box: [43, 22, 526, 433],
      about: { title: 'אי הקסמים', text: 'אותיות קסומות שמשנות את הצליל של האותיות לידן. (טקסט דמו)' } },
    { name: 'אי החזרות', page: 'review.html?r=1-34', review: '1-34', img: 'island-review', box: [32, -14, 504, 504],
      about: { title: 'זמן לחזרה!', text: 'חוזרים על מה שלמדנו, צוברים תרגולים ומקבלים פרסים. (טקסט דמו)' } },
    { name: 'אי הצלילים המיוחדים', page: 'sounds.html', lessons: '35-38', coins: 40, img: 'island-sounds-music', box: [8, 26, 540, 392],
      about: { title: 'צלילים מתקדמים', text: 'צירופים מיוחדים של אותיות ליודעי קריאה אמיצים. (טקסט דמו)' } },
    { name: 'אי החזרות', page: 'review.html?r=1-38', review: '1-38', img: 'island-review', box: [32, -14, 504, 504],
      about: { title: 'זמן לחזרה!', text: 'חוזרים על מה שלמדנו, צוברים תרגולים ומקבלים פרסים. (טקסט דמו)' } },
    // End of the course: a white circle with confetti and a trophy
    { name: 'סיימת את כל השיעורים', finale: true, status: 'finale' },
  ];

  // Where the end of a practice leads: its island's next stage (the practice
  // section's data-next-href, with data-next-label), or – after the island's
  // last stage – the next island on the map.
  // The finale (the home page's last stop, and review 5's end): coins and chests collected, the sentence still to complete
  // (from the letter shop, or a demo one) and the way to finish it
  window.finaleCard = function (firstName, confetti) {
    let sentence = { en: 'Dream big!', found: 'dre' };
    try {
      const shop = JSON.parse(localStorage.getItem('en-app:shop'));
      if (shop && shop.sentences && shop.sentences[0]) sentence = shop.sentences[0];
    } catch (err) { /* no saved shop */ }
    const coins = document.querySelector('.stat--coins .stat__value')?.textContent || '350';
    const chests = document.querySelector('.stat--chest .stat__value')?.textContent || '3';
    const letters = [...new Set(sentence.en.toLowerCase().replace(/[^a-z]/g, ''))];
    const missing = letters.filter((l) => !sentence.found.includes(l)).length;
    const tiles = sentence.en.split(' ').map((w) => `<span class="finale__word">${w.split('').map((ch) => {
      const l = ch.toLowerCase();
      if (!/[a-z]/.test(l)) return `<b class="finale__tile finale__tile--mark">${ch}</b>`;
      return sentence.found.includes(l) ? `<b class="finale__tile is-found">${ch}</b>` : '<b class="finale__tile">?</b>';
    }).join('')}</span>`).join('');
    return `<div class="finale">
      <span class="finale__confetti" aria-hidden="true">${confetti}</span>
      <img class="finale__trophy" src="assets/trophy.svg" alt="">
      <p class="finale__en" lang="en" dir="ltr">Very Good!</p>
      <p class="finale__text">${firstName ? `${firstName}, ` : ''}סיימת את כל השיעורים!</p>
      <div class="finale__stats">
        <span class="finale__stat"><img src="assets/coin.webp" alt=""><b>${coins}</b> מטבעות</span>
        <span class="finale__stat"><img src="assets/chest.webp" alt=""><b>${chests}</b> תיבות אוצר</span>
      </div>
      <p class="finale__note">${missing ? `למרות שסיימת את כל השלבים, נשארו לך עוד <b>${missing}</b> אותיות לרכוש ולנחש במשפט:` : 'השלמת את המשפט! אפשר להגריל משפט חדש בחנות:'}</p>
      <div class="finale__sentence" lang="en" dir="ltr">${tiles}</div>
      <span class="finale__actions">
        <button class="finale__btn" type="button" data-finale="shop"><img class="finale__shop-icon" src="assets/shop.webp" alt=""><span>אני רוצה לקנות אותיות</span></button>
        <button class="finale__btn finale__btn--alt" type="button" data-finale="reviews"><span>רוצה לצבור עוד מטבעות</span><img src="assets/chevron.svg" alt="" class="finale__chevron"></button>
      </span>
    </div>`;
  };
  // after review number n: the next island on the map
  window.afterReview = function (n) {
    const list = window.ISLANDS;
    let seen = 0;
    const at = list.findIndex((island) => island.review && ++seen === n);
    const next = at >= 0 ? list[at + 1] : null;
    if (next && next.page) return { href: next.page, label: 'ל' + next.name, name: next.name, pic: next.img };
    return { href: 'index.html', label: 'למפת האיים', name: 'מפת האיים' };
  };
  window.practiceNext = function (section) {
    const d = (section && section.dataset) || {};
    const list = window.ISLANDS;
    const at = list.findIndex((island) => island.page === d.islandPage);
    // the next stage of the same island: that island's picture
    if (d.nextHref) return { href: d.nextHref, label: d.nextLabel || 'לשלב הבא', pic: at >= 0 ? list[at].img : '' };
    const next = at >= 0 ? list[at + 1] : null;
    // a review: straight to its practice (its range and number)
    if (next && next.review) {
      const no = list.slice(0, at + 2).filter((island) => island.review).length;
      return { href: `review-practice.html?r=${next.review}&p=${no}`, label: 'לחזרה ' + no, pic: next.img };
    }
    if (next && next.page) return { href: next.page, label: 'ל' + next.name, pic: next.img };
    return { href: 'index.html', label: 'למפת האיים' };
  };
})();
