import { put, list, del } from '@vercel/blob';
import { guard, json, validId, isBlobUrl } from './_lib.js';

// Each track is one JSON blob at tracks/<id>-<random>.json; saving writes a new one and removes the old.
async function listAll(prefix) {
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

export async function GET(request) {
  const denied = guard(request);
  if (denied) return denied;
  const blobs = await listAll('tracks/');
  const latest = new Map();
  for (const b of blobs) {
    const m = b.pathname.match(/^tracks\/([a-z0-9]+)-/);
    if (!m) continue;
    const prev = latest.get(m[1]);
    if (!prev || new Date(b.uploadedAt) > new Date(prev.uploadedAt)) latest.set(m[1], b);
  }
  const tracks = (await Promise.all([...latest.values()].map(async (b) => {
    try {
      const res = await fetch(b.url, { cache: 'no-store' });
      return res.ok ? await res.json() : null;
    } catch (e) {
      return null;
    }
  }))).filter(Boolean);
  tracks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return json({ tracks });
}

export async function POST(request) {
  const denied = guard(request);
  if (denied) return denied;
  let t;
  try { t = await request.json(); } catch (e) { return json({ error: '잘못된 요청이에요.' }, 400); }
  if (!validId(t.id)) return json({ error: '잘못된 자료 ID예요.' }, 400);
  if (!Array.isArray(t.parts) || !t.parts.length || !t.parts.every(isBlobUrl)) return json({ error: '음성 파일 정보가 없어요.' }, 400);
  if (!Array.isArray(t.segments)) return json({ error: '스크립트 정보가 없어요.' }, 400);
  const rec = {
    id: t.id,
    title: String(t.title || '').slice(0, 300),
    segments: t.segments.map((s) => ({ s: Number(s.s) || 0, t: String(s.t || '') })),
    duration: Number(t.duration) || 0,
    audioType: String(t.audioType || 'audio/mpeg'),
    size: Number(t.size) || 0,
    parts: t.parts,
    createdAt: Number(t.createdAt) || Date.now(),
    updatedAt: Date.now(),
  };
  const saved = await put(`tracks/${rec.id}.json`, JSON.stringify(rec), {
    access: 'public',
    addRandomSuffix: true,
    contentType: 'application/json',
  });
  const old = (await listAll(`tracks/${rec.id}-`)).filter((b) => b.url !== saved.url).map((b) => b.url);
  if (old.length) await del(old);
  return json({ track: rec });
}

export async function DELETE(request) {
  const denied = guard(request);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id');
  if (!validId(id)) return json({ error: '잘못된 자료 ID예요.' }, 400);
  const urls = [...(await listAll(`tracks/${id}-`)), ...(await listAll(`audio/${id}/`))].map((b) => b.url);
  if (urls.length) await del(urls);
  return json({ deleted: urls.length });
}
