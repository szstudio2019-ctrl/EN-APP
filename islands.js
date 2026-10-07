// Shared island list for every page (map, island pages and the side menu).
(function () {
  // Course order from Figma ("Group 1261154890"). `box` is where the artwork sits
  // inside the 556x497 island frame (left, top, width, height), as in the design.
  // Islands without artwork (img: null) get a simple placeholder island.
  // `status` is the learner's progress (demo values): 'done', 'progress' (with
  // `progress` %), or locked when omitted. Locked islands stay locked even while
  // the learner scrolls past them to look.
  window.ISLANDS = [
    { name: 'אי זיהוי האותיות', lessons: '1', img: 'island-abc', box: [0, 0, 568, 476.6], status: 'done',
      about: { title: 'נכיר את האותיות!', text: 'בעולם הזה נפגוש את כל האותיות באנגלית ונלמד לזהות אותן. (טקסט דמו)' } },
    { name: 'אי האותיות של רופא/ה', lessons: '2-4', img: 'island-doctor-still', box: [11, -5, 564, 501], video: 'island-doctor-ahh', videoBox: [11, -5, 564, 501], sound: 'doctor-ahh', status: 'progress', progress: 50, page: 'doctor.html',
      about: {
        title: 'האות a היא הרופא/ה!',
        text: 'בעולם הזה נכיר את האות a – שאומרת לאות שלפניה להגיד אַה, כמו אצל הרופא/ה.',
      } },
    { name: 'אי האותיות המחייכות', lessons: '5-11', img: 'island-smiles', box: [21, 27, 529, 423],
      about: { title: 'האותיות המחייכות', text: 'כאן נכיר אותיות שמחות שמשנות את הצליל של המילה. (טקסט דמו)' } },
    { name: 'אי החזרות', review: '1-10', img: 'island-review', box: [32, -14, 504, 504],
      about: { title: 'זמן לחזרה!', text: 'חוזרים על מה שלמדנו, צוברים תרגולים ומקבלים פרסים. (טקסט דמו)' } },
    { name: 'אי האותיות הבודדות', lessons: '11-16', img: 'island-single', box: [49, 0, 493, 493],
      about: { title: 'האותיות הבודדות', text: 'אותיות שאוהבות לעמוד לבד – ונלמד איך הן נשמעות. (טקסט דמו)' } },
    { name: 'אי החזרות', review: '1-16', img: 'island-review', box: [32, -14, 504, 504],
      about: { title: 'זמן לחזרה!', text: 'חוזרים על מה שלמדנו, צוברים תרגולים ומקבלים פרסים. (טקסט דמו)' } },
    { name: 'אי צירוף האותיות', lessons: '17-21', img: 'island-blending', box: [0, 48, 557, 371],
      about: { title: 'מחברים אותיות', text: 'נחבר אותיות למילים קצרות ונקרא אותן יחד. (טקסט דמו)' } },
    { name: 'אי החזרות', review: '1-21', img: 'island-review', box: [32, -14, 504, 504],
      about: { title: 'זמן לחזרה!', text: 'חוזרים על מה שלמדנו, צוברים תרגולים ומקבלים פרסים. (טקסט דמו)' } },
    { name: 'אי האותיות השורקות', lessons: '22-25', img: 'island-whistling', box: [7, 17, 528, 434], flip: true,
      about: { title: 'האותיות השורקות', text: 'ששש... אותיות שעושות צליל של רוח ושריקה. (טקסט דמו)' } },
    { name: 'אי הקסמים', lessons: '26-34', img: 'island-magic', box: [43, 22, 526, 433],
      about: { title: 'אי הקסמים', text: 'אותיות קסומות שמשנות את הצליל של האותיות לידן. (טקסט דמו)' } },
    { name: 'אי החזרות', review: '1-34', img: 'island-review', box: [32, -14, 504, 504],
      about: { title: 'זמן לחזרה!', text: 'חוזרים על מה שלמדנו, צוברים תרגולים ומקבלים פרסים. (טקסט דמו)' } },
    { name: 'אי הצלילים המתקדמים', lessons: '35-38', coins: 40, img: 'island-sounds-music', box: [8, 26, 540, 392],
      about: { title: 'צלילים מתקדמים', text: 'צירופים מיוחדים של אותיות ליודעי קריאה אמיצים. (טקסט דמו)' } },
    { name: 'אי החזרות', review: '1-38', img: 'island-review', box: [32, -14, 504, 504],
      about: { title: 'זמן לחזרה!', text: 'חוזרים על מה שלמדנו, צוברים תרגולים ומקבלים פרסים. (טקסט דמו)' } },
  ];
})();
