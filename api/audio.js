import { guard, json, isBlobUrl } from './_lib.js';

// Fallback for browsers that cannot fetch a blob URL directly; parts are 4 MB, under the response limit.
export async function GET(request) {
  const denied = guard(request);
  if (denied) return denied;
  const u = new URL(request.url).searchParams.get('u');
  if (!isBlobUrl(u)) return json({ error: '잘못된 요청이에요.' }, 400);
  const res = await fetch(u);
  if (!res.ok) return json({ error: '음성 파일을 찾지 못했어요.' }, 404);
  return new Response(res.body, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'private, max-age=86400' } });
}
