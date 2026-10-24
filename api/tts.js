import { guard, json, safe } from './_lib.js';

const VOICES = ['marin', 'coral', 'nova', 'shimmer', 'sage'];

const PERSONA = [
  'Identity: a cheerful, warm, emotionally intelligent American woman in her mid-twenties. She sounds mature and grounded, never childish, overly excited, or salesy.',
  'Accent: natural General American English with relaxed connected speech — contractions, linking, and reductions the way native speakers really talk.',
].join(' ');

const STYLES = {
  talk: 'Delivery: talk like you are chatting with a good friend. Let the pitch rise and fall naturally, lightly stress the words that carry the meaning, and color each sentence with the emotion its words suggest — curious on questions, warm on kind words, upbeat on good news, a little softer on serious points. Keep a gentle smile in the voice. Pause where a person would naturally breathe or think, not at fixed intervals.',
  present: 'Delivery: a confident, engaging presenter explaining something to a small group. Clear and articulate, with purposeful emphasis on key ideas, natural variation in pace, and short pauses before important points. Friendly and assured, never monotone or robotic.',
  story: 'Delivery: an expressive storyteller. Vary pace and pitch to follow the story — slow down for important moments, speed up a little for excitement, and let feelings show in the voice. Natural pauses for effect, never theatrical or cartoonish.',
};

const RULES = 'Read the text exactly as written. Do not add, skip, or change any words, and do not read any labels or notes.';

// Reads a passage aloud and returns raw 24 kHz 16-bit mono PCM.
export const POST = safe(async (request) => {
  const denied = guard(request);
  if (denied) return denied;
  const key = process.env.OPENAI_API_KEY;
  if (!key) return json({ error: 'AI 음성을 쓰려면 Vercel 환경 변수 OPENAI_API_KEY를 추가해야 해요.' }, 500);
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const text = String(body.text || '').trim();
  const voice = VOICES.includes(body.voice) ? body.voice : 'marin';
  const style = STYLES[body.style] ? body.style : 'talk';
  if (!text) return json({ error: '읽을 문장이 없어요.' }, 400);
  if (text.length > 1500) return json({ error: '문장이 너무 길어요. 1500자 이하로 나눠 주세요.' }, 400);
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      voice,
      input: text,
      instructions: `${PERSONA} ${STYLES[style]} ${RULES}`,
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
