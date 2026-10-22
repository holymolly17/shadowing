import { put } from '@vercel/blob';
import { guard, json, validId } from './_lib.js';

const MAX_PART = 4.4 * 1024 * 1024;

// One piece of an audio file per request; the page splits files into 4 MB parts.
export async function POST(request) {
  const denied = guard(request);
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const part = Number(searchParams.get('part'));
  if (!validId(id) || !Number.isInteger(part) || part < 0 || part > 9999) return json({ error: '잘못된 요청이에요.' }, 400);
  const buf = Buffer.from(await request.arrayBuffer());
  if (!buf.length) return json({ error: '빈 파일이에요.' }, 400);
  if (buf.length > MAX_PART) return json({ error: '조각이 너무 커요.' }, 413);
  const blob = await put(`audio/${id}/${String(part).padStart(4, '0')}.bin`, buf, {
    access: 'public',
    addRandomSuffix: true,
    contentType: 'application/octet-stream',
  });
  return json({ url: blob.url });
}
