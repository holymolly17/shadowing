import { guard, json, safe } from './_lib.js';

// Two engines: ElevenLabs (most expressive, returns per-character timing) and OpenAI.
// A voice id is "<engine>:<id>", e.g. "el:cgSgspJ2msm6clMCkdW9" or "oa:marin".
const OPENAI_VOICES = [
  { id: 'marin', name: 'Marin', note: '가장 자연스러운 기본 목소리' },
  { id: 'coral', name: 'Coral', note: '밝고 생기 있는 톤' },
  { id: 'nova', name: 'Nova', note: '또렷하고 경쾌한 톤' },
  { id: 'shimmer', name: 'Shimmer', note: '부드럽고 차분한 톤' },
  { id: 'sage', name: 'Sage', note: '따뜻하고 안정적인 톤' },
];

const PERSONA = [
  'Identity: a cheerful, warm, emotionally intelligent American woman in her mid-twenties. She sounds mature and grounded, never childish or salesy.',
  'Accent: natural General American English with relaxed connected speech: contractions, linking, and reductions the way native speakers really talk.',
  'Intonation: use a wide, lively pitch range. Never read flat or monotone. Let the pitch clearly rise on yes/no questions and fall at the end of statements, and lift on the words that matter.',
].join(' ');

const STYLES = {
  talk: 'Delivery: talk like you are chatting with a good friend in person. Color each sentence with the emotion its words suggest: curious on questions, warm on kind words, excited on good news, a little softer on serious points. Keep a smile in the voice. Pause where a person would naturally breathe or think.',
  present: 'Delivery: a confident, engaging presenter explaining something to a small group. Clear, with purposeful emphasis on key ideas, natural variation in pace, and short pauses before important points. Friendly and assured, never robotic.',
  story: 'Delivery: an expressive storyteller. Vary pace and pitch to follow the story: slow down for important moments, speed up a little for excitement, and let feelings show. Natural pauses for effect, never cartoonish.',
};
const RULES = 'Read the text exactly as written. Do not add, skip, or change any words.';

// ElevenLabs v3 stability: 0 = creative, 0.5 = natural, 1 = robust.
const EL_STABILITY = { talk: 0.5, present: 0.5, story: 0 };

const b64 = async (res) => Buffer.from(await res.arrayBuffer()).toString('base64');

async function elevenVoices(key) {
  const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key } });
  if (!res.ok) throw new Error('ElevenLabs 목소리 목록을 불러오지 못했어요 (' + res.status + ').');
  const { voices = [] } = await res.json();
  const female = voices.filter((v) => (v.labels?.gender || '').toLowerCase() === 'female');
  const american = female.filter((v) => /american|us/i.test(v.labels?.accent || ''));
  const pool = american.length ? american : female;
  const rank = (v) => (/young/i.test(v.labels?.age || '') ? 0 : 1);
  return pool.sort((a, b) => rank(a) - rank(b)).slice(0, 12).map((v) => ({
    id: 'el:' + v.voice_id,
    engine: 'elevenlabs',
    name: v.name,
    note: [v.labels?.age, v.labels?.descriptive || v.labels?.description, v.labels?.use_case].filter(Boolean).join(' · '),
  }));
}

export const GET = safe(async (request) => {
  const denied = guard(request);
  if (denied) return denied;
  const el = process.env.ELEVENLABS_API_KEY, oa = process.env.OPENAI_API_KEY;
  const voices = [];
  let error = null;
  if (el) {
    try { voices.push(...(await elevenVoices(el))); } catch (e) { error = e.message; }
  }
  if (oa) voices.push(...OPENAI_VOICES.map((v) => ({ ...v, id: 'oa:' + v.id, engine: 'openai' })));
  if (!el && !oa) error = 'AI 음성을 쓰려면 Vercel 환경 변수 ELEVENLABS_API_KEY 또는 OPENAI_API_KEY를 추가해야 해요.';
  return json({ voices, error, engines: { elevenlabs: !!el, openai: !!oa } });
});

async function speakEleven(key, id, text, style) {
  const body = JSON.stringify({
    text,
    model_id: process.env.ELEVENLABS_MODEL || 'eleven_v3',
    voice_settings: { stability: EL_STABILITY[style] },
  });
  const headers = { 'xi-api-key': key, 'Content-Type': 'application/json' };
  const base = `https://api.elevenlabs.io/v1/text-to-speech/${id}`;
  let res = await fetch(`${base}/with-timestamps?output_format=pcm_24000`, { method: 'POST', headers, body });
  if (res.ok) {
    const j = await res.json();
    return { audio: j.audio_base64, alignment: j.alignment || null };
  }
  // Some models do not offer timestamps; fall back to plain audio.
  if (res.status === 400 || res.status === 422) {
    res = await fetch(`${base}?output_format=pcm_24000`, { method: 'POST', headers, body });
    if (res.ok) return { audio: await b64(res), alignment: null };
  }
  let msg = '';
  try { const j = await res.json(); msg = j.detail?.message || j.detail?.status || JSON.stringify(j.detail || j); } catch (e) {}
  const hint = res.status === 401 ? ' (API 키를 확인하세요)' : res.status === 402 || /quota|credit/i.test(msg) ? ' (크레딧이나 요금제를 확인하세요)' : '';
  throw new Error(`ElevenLabs 음성을 만들지 못했어요${hint}: ${msg || res.status}`);
}

async function speakOpenAI(key, id, text, style) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      voice: id,
      input: text,
      instructions: `${PERSONA} ${STYLES[style]} ${RULES}`,
      response_format: 'pcm',
    }),
  });
  if (!res.ok) {
    let msg = '';
    try { msg = (await res.json()).error?.message || ''; } catch (e) {}
    const hint = res.status === 401 ? ' (API 키를 확인하세요)' : res.status === 429 ? ' (사용 한도나 결제 상태를 확인하세요)' : '';
    throw new Error(`OpenAI 음성을 만들지 못했어요${hint}: ${msg || res.status}`);
  }
  return { audio: await b64(res), alignment: null };
}

// Reads a passage aloud. Responds with base64 24 kHz 16-bit mono PCM, plus character timing when available.
export const POST = safe(async (request) => {
  const denied = guard(request);
  if (denied) return denied;
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const text = String(body.text || '').trim();
  const style = STYLES[body.style] ? body.style : 'talk';
  if (!text) return json({ error: '읽을 문장이 없어요.' }, 400);
  if (text.length > 1500) return json({ error: '문장이 너무 길어요. 1500자 이하로 나눠 주세요.' }, 400);
  const raw = String(body.voice || '');
  const [engine, id] = raw.includes(':') ? [raw.slice(0, raw.indexOf(':')), raw.slice(raw.indexOf(':') + 1)] : ['oa', raw];
  if (engine === 'el') {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) return json({ error: 'Vercel 환경 변수 ELEVENLABS_API_KEY가 없어요.' }, 500);
    if (!/^[A-Za-z0-9]{8,64}$/.test(id)) return json({ error: '잘못된 목소리예요.' }, 400);
    return json(await speakEleven(key, id, text, style));
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) return json({ error: 'Vercel 환경 변수 OPENAI_API_KEY가 없어요.' }, 500);
  const v = OPENAI_VOICES.some((x) => x.id === id) ? id : 'marin';
  return json(await speakOpenAI(key, v, text, style));
});
