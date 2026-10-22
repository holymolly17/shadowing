import { guard, json, isBlobUrl, readBlob, safe } from './_lib.js';

// Serves audio parts for private stores, or when a browser cannot fetch a blob URL directly.
// Parts are 4 MB, under the function response limit.
export const GET = safe(async (request) => {
  const denied = guard(request);
  if (denied) return denied;
  const u = new URL(request.url).searchParams.get('u');
  if (!isBlobUrl(u)) return json({ error: '잘못된 요청이에요.' }, 400);
  const res = await readBlob(u);
  if (!res) return json({ error: '음성 파일을 찾지 못했어요.' }, 404);
  return new Response(res.body, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'private, max-age=86400' } });
});
