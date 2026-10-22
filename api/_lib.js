import crypto from 'node:crypto';

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export function setupError() {
  if (!process.env.APP_PASSWORD) return 'Vercel 환경 변수 APP_PASSWORD가 설정되지 않았어요.';
  // Newer Blob stores connect with BLOB_STORE_ID (OIDC); older ones with BLOB_READ_WRITE_TOKEN.
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) return 'Vercel Blob 저장소가 이 프로젝트에 연결되지 않았어요.';
  return null;
}

// The session token is derived from the password, so changing APP_PASSWORD signs every device out.
export const tokenFor = (password) =>
  crypto.createHmac('sha256', password).update('shadowing-session-v1').digest('hex');

export function sameSecret(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

export function isAuthed(request) {
  const password = process.env.APP_PASSWORD;
  if (!password) return false;
  const given = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return given.length > 0 && sameSecret(given, tokenFor(password));
}

export const validId = (id) => /^[a-z0-9]{6,40}$/.test(id || '');

export const isBlobUrl = (u) => {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && url.hostname.endsWith('.blob.vercel-storage.com');
  } catch (e) {
    return false;
  }
};

// Every guarded handler starts with this: setup check, then auth.
export function guard(request) {
  const err = setupError();
  if (err) return json({ error: err }, 500);
  if (!isAuthed(request)) return json({ error: '다시 로그인해 주세요.' }, 401);
  return null;
}
