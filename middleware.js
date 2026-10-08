// © 2026 Sarit Zobel – SZ Studio. All rights reserved.
// נעילת האתר בדף כניסה מעוצב – Vercel Routing Middleware.
// שם משתמש וסיסמה מוגדרים ב-Vercel → Settings → Environment Variables:
//   SITE_USER, SITE_PASSWORD
// אם הסיסמה לא הוגדרה – האתר נעול לגמרי.

export const config = { matcher: '/:path*' };

const COOKIE = 'sz_preview';
const PUBLIC = ['/assets/bg-clouds.webp', '/assets/logo-ring.svg'];

async function tokenFor(user, pass) {
  const data = new TextEncoder().encode(`sz:${user}:${pass}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  const m = raw.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : null;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  if (PUBLIC.includes(url.pathname)) return;

  const user = process.env.SITE_USER || 'client';
  const pass = process.env.SITE_PASSWORD;
  const token = pass ? await tokenFor(user, pass) : null;

  // שליחת הטופס
  if (url.pathname === '/__login' && request.method === 'POST') {
    const form = await request.formData();
    let next = String(form.get('next') || '/');
    if (!next.startsWith('/') || next.startsWith('//')) next = '/';
    if (token && form.get('user') === user && form.get('pass') === pass) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: next,
          'Set-Cookie': `${COOKIE}=${token}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return new Response(null, {
      status: 303,
      headers: { Location: `/?err=1&next=${encodeURIComponent(next)}` },
    });
  }

  if (token && getCookie(request, COOKIE) === token) return; // מורשה – ממשיכים לאתר

  const next = url.searchParams.get('next') || (url.pathname + url.search);
  return new Response(loginPage(url.searchParams.has('err'), next), {
    status: 401,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function loginPage(error, next) {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>כניסה – מדקדקים באנגלית</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&family=Playpen+Sans+Hebrew:wght@500&family=Varela+Round&display=swap" rel="stylesheet">
<style>
  :root{--navy:#2b2870;--navy-d:#14124a;--pink:#e33563;--pink-l:#ff5fa8;--yellow:#eeb741;--lav:#c9b6e6;--soft:#f1f0fa}
  *{box-sizing:border-box;margin:0}
  html,body{height:100%}
  body{
    font-family:'Rubik',sans-serif;color:var(--navy);
    background:#b9a3e3 url('/assets/bg-clouds.webp') center/cover no-repeat fixed;
    display:grid;place-items:center;padding:16px;min-height:100vh;
  }
  .wrap{width:100%;max-width:400px;animation:in .7s cubic-bezier(.2,.8,.2,1) both}
  @keyframes in{from{opacity:0;transform:translateY(24px) scale(.97)}}
  .logo-wrap{overflow:visible;width:100%;display:flex;justify-content:center;margin-bottom:18px}
  .logo{position:relative;display:block;width:345px;height:79px;flex:none;transform:translateX(-14px);filter:drop-shadow(0 2px 3px rgba(29,43,122,.55)) drop-shadow(0 4px 14px rgba(29,43,122,.35))}
  .logo__text{position:absolute;top:0;right:76px;height:79px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:2px;direction:rtl;white-space:nowrap}
  .logo__title{font-family:'Rubik',sans-serif;font-weight:700;font-size:34px;line-height:1.05;color:#fff}
  .logo__subtitle{font-family:'Playpen Sans Hebrew','Rubik',cursive;font-weight:500;font-size:17px;line-height:1.2;color:#6fd3f5}
  .logo__mark{position:absolute;top:14.12px;left:278.74px;width:56.122px;height:64.766px}
  .logo__ring{position:absolute;top:-3.01px;left:-2.99px;width:59.107px;height:72.002px}
  .logo__tile{position:absolute;width:26.31px;height:33.1px;border-radius:4.244px;display:flex;align-items:center;justify-content:center;font-family:'Varela Round','Rubik',sans-serif;font-weight:700;font-size:35.977px;line-height:1;color:#fff}
  .logo__tile--a{top:14.39px;left:22.7px;background:#fff;color:#1d2b7a;transform:rotate(-10.69deg)}
  .logo__tile--c{top:14.38px;left:65.7px;background:#e33563;transform:rotate(-10.72deg)}
  .logo__tile--b{top:14.38px;left:44.7px;background:#eeb741;transform:rotate(6.68deg)}
  @media (max-width:440px){.logo{transform:translateX(-12px) scale(.82)}}
  .card{
    padding:30px 28px 24px;border-radius:28px;
    background:rgba(255,255,255,.92);
    border:3px solid #fff;
    box-shadow:0 18px 50px rgba(36,34,117,.25), 0 0 0 6px rgba(255,255,255,.3);
  }
  h1{font-size:20px;font-weight:700;text-align:center;color:var(--navy);margin-bottom:4px}
  .sub{font-size:14px;text-align:center;color:rgba(43,40,112,.65);margin-bottom:22px}
  label{display:block;font-size:14px;font-weight:500;margin:0 4px 6px;color:var(--navy)}
  input{
    width:100%;height:50px;border-radius:16px;border:2px solid var(--lav);
    background:var(--soft);padding:0 16px;font:inherit;font-size:16px;color:var(--navy);
    margin-bottom:16px;outline:none;transition:border-color .2s, box-shadow .2s, background .2s;
  }
  input:focus{border-color:var(--pink);background:#fff;box-shadow:0 0 0 4px rgba(227,53,99,.18)}
  #u{direction:ltr;text-align:right}
  button{
    width:100%;height:54px;margin-top:6px;border:0;border-radius:18px;cursor:pointer;
    font:inherit;font-size:18px;font-weight:700;color:#fff;
    background:linear-gradient(180deg,var(--pink-l),var(--pink));
    box-shadow:0 6px 0 #b8204a, 0 10px 22px rgba(227,53,99,.35);
    transition:transform .1s, box-shadow .1s;
  }
  button:hover{filter:brightness(1.06)}
  button:active{transform:translateY(4px);box-shadow:0 2px 0 #b8204a, 0 4px 12px rgba(227,53,99,.3)}
  .err{background:#fff3f6;color:var(--pink);border:1.5px solid #ffdbe6;border-radius:12px;padding:10px 14px;font-size:14px;font-weight:500;text-align:center;margin-bottom:16px}
  .foot{margin-top:18px;text-align:center;font-size:12px;color:rgba(43,40,112,.55)}
  .dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--yellow);vertical-align:middle;margin:0 6px}
  @media (prefers-reduced-motion:reduce){.wrap{animation:none}}
</style>
</head>
<body>
  <div class="wrap">
    <div class="logo-wrap">
      <div class="logo" role="img" aria-label="מדקדקים באנגלית – קורס דיגיטלי באנגלית">
        <span class="logo__text"><span class="logo__title">מדקדקים באנגלית</span><span class="logo__subtitle">קורס דיגיטלי באנגלית</span></span>
        <span class="logo__mark"><img class="logo__ring" src="/assets/logo-ring.svg" alt=""><span class="logo__tile logo__tile--a">a</span><span class="logo__tile logo__tile--c">c</span><span class="logo__tile logo__tile--b">b</span></span>
      </div>
    </div>
    <form class="card" method="post" action="/__login">
      <h1>ברוכים הבאים!</h1>
      <p class="sub">גרסת תצוגה – הכניסה בהרשאה בלבד</p>
      ${error ? '<div class="err">שם משתמש או סיסמה שגויים</div>' : ''}
      <input type="hidden" name="next" value="${esc(next)}">
      <label for="u">שם משתמש</label>
      <input id="u" name="user" autocomplete="username" required autofocus>
      <label for="p">סיסמה</label>
      <input id="p" name="pass" type="password" autocomplete="current-password" required>
      <button type="submit">כניסה</button>
      <p class="foot">© 2026 SZ Studio<span class="dot"></span>כל הזכויות שמורות</p>
    </form>
  </div>
</body>
</html>`;
}
