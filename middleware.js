// © 2026 Sarit Zobel – SZ Studio. All rights reserved.
// נעילת האתר בסיסמה (Basic Auth) – Vercel Routing Middleware.
// שם משתמש וסיסמה מוגדרים ב-Vercel → Settings → Environment Variables:
//   SITE_USER, SITE_PASSWORD
// אם הסיסמה לא הוגדרה – האתר נעול לגמרי.

export const config = { matcher: '/:path*' };

export default function middleware(request) {
  const user = process.env.SITE_USER || 'client';
  const pass = process.env.SITE_PASSWORD;

  const auth = request.headers.get('authorization');
  if (pass && auth && auth.startsWith('Basic ')) {
    try {
      const [u, ...rest] = atob(auth.slice(6)).split(':');
      if (u === user && rest.join(':') === pass) return; // מורשה – ממשיכים לאתר
    } catch (e) {}
  }

  return new Response('האתר בבנייה – הגישה מוגבלת', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="SZ Studio – Preview", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
