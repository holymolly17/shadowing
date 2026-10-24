import { guard, json, safe } from './_lib.js';

const VOICES = ['marin', 'coral', 'nova', 'shimmer', 'sage'];

const INSTRUCTIONS = [
  'Voice: a cheerful, warm American woman in her mid-twenties who sounds mature and composed, like a confident young professional.',
  'Accent: natural General American English.',
  'Tone: bright and friendly, never childish or overly excited.',
  'Pacing: natural conversational speed with clear enunciation, so a language learner can repeat after you.',
  'Read the text exactly as written. Do not add, skip, or change any words.',
].join(' ');

// Reads one sentence aloud and returns raw 24 kHz 16-bit mono PCM.
export const POST = safe(async (request) => {
  const denied = guard(request);
  if (denied) return denied;
  const key = process.env.OPENAI_API_KEY;
  if (!key) return json({ error: 'AI 음성을 쓰려면 Vercel 환경 변수 OPENAI_API_KEY를 추가해야 해요.' }, 500);
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const text = String(body.text || '').trim();
  const voice = VOICES.includes(body.voice) ? body.voice : 'marin';
  if (!text) return json({ error: '읽을 문장이 없어요.' }, 400);
  if (text.length > 1500) return json({ error: '문장이 너무 길어요. 1500자 이하로 나눠 주세요.' }, 400);
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      voice,
      input: text,
      instructions: INSTRUCTIONS,
      response_format: 'pcm',
    }),
  });
  if (!res.ok) {
    let msg = '';
    try { msg = (await res.json()).error?.message || ''; } catch (e) {}
    const hint = res.status === 401 ? ' (API 키를 확인하세요)' : res.status === 429 ? ' (사용 한도나 결제 상태를 확인하세요)' : '';
    return json({ error: `AI 음성을 만들지 못했어요${hint}: ${msg || res.status}` }, 502);
  }
  return new Response(res.body, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store' } });
});
