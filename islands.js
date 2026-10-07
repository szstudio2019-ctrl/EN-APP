// Shared island list for every page (map, island pages and the side menu).
(function () {
  // Course order from Figma ("Group 1261154890"). `box` is where the artwork sits
  // inside the 556x497 island frame (left, top, width, height), as in the design.
  // Islands without artwork (img: null) get a simple placeholder island.
  // `status` is the learner's progress (demo values): 'done', 'progress' (with
  // `progress` %), or locked when omitted. Locked islands stay locked even while
  // the learner scrolls past them to look.
  window.ISLANDS = [
    { name: 'אי זיהוי אותיות', lessons: '1', img: 'island-abc', box: [0, 0, 568, 476.6], status: 'done' },
    { name: 'אי האותיות של רופא/ה', lessons: '2-4', img: 'island-doctor-still', box: [11, -5, 564, 501], video: 'island-doctor-ahh', videoBox: [11, -5, 564, 501], sound: 'doctor-ahh', status: 'progress', progress: 50, page: 'doctor.html',
      about: {
        title: 'האות a היא הרופא/ה!',
        text: 'בעולם הזה נכיר את האות a – שאומרת לאות שלפניה להגיד אַה, כמו אצל הרופא/ה.',
      } },
    { name: 'אי האותיות המחייכות', lessons: '5-11', img: 'island-smiles', box: [21, 27, 529, 423] },
    { name: 'אי החזרות', review: '1-11', img: 'island-review', box: [32, -14, 504, 504] },
    { name: 'אי האותיות הבודדות', lessons: '13-19', img: 'island-single', box: [49, 0, 493, 493] },
    { name: 'אי החזרות', review: '1-19', img: 'island-review', box: [32, -14, 504, 504] },
    { name: 'אי צירוף האותיות', lessons: '20-27', img: 'island-blending', box: [0, 48, 557, 371] },
    { name: 'אי האותיות השורקות', lessons: '28-31', img: 'island-whistling', box: [7, 17, 528, 434], flip: true },
    { name: 'אי הקסמים', lessons: '32-39', img: 'island-magic', box: [43, 22, 526, 433] },
    { name: 'אי הצלילים המתקדמים', lessons: '42-45', coins: 40, img: 'island-sounds', box: [5, 51, 571, 381] },
    { name: 'אי החזרות', review: '1-45', img: 'island-review', box: [32, -14, 504, 504] },
  ];
})();
