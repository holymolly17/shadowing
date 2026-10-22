// Supabase 프로젝트 정보 (Project Settings → API).
// anon key는 브라우저에 공개되도록 만들어진 키라 여기에 넣어도 괜찮아요.
// 데이터 보호는 supabase/schema.sql의 행 수준 보안(RLS) 정책이 맡아요.
window.SHADOWING_CONFIG = {
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY',
};
