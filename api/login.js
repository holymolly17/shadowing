import { json, setupError, sameSecret, tokenFor } from './_lib.js';

export async function POST(request) {
  const err = setupError();
  if (err) return json({ error: err }, 500);
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const password = process.env.APP_PASSWORD;
  if (!sameSecret(body.password || '', password)) {
    await new Promise((r) => setTimeout(r, 700));
    return json({ error: '비밀번호가 맞지 않아요.' }, 401);
  }
  return json({ token: tokenFor(password) });
}
