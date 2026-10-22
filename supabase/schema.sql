-- 쉐도잉 플레이어 Supabase 설정
-- Supabase 대시보드 → SQL Editor → New query 에 전체를 붙여 넣고 Run 하세요.
-- 여러 번 실행해도 괜찮아요.

-- 1) 자료 목록 테이블
create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '',
  segments jsonb not null default '[]'::jsonb,
  duration double precision not null default 0,
  audio_path text not null,
  audio_type text not null default 'audio/mpeg',
  size bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.tracks enable row level security;

drop policy if exists "tracks: read own" on public.tracks;
drop policy if exists "tracks: insert own" on public.tracks;
drop policy if exists "tracks: update own" on public.tracks;
drop policy if exists "tracks: delete own" on public.tracks;

create policy "tracks: read own" on public.tracks
  for select to authenticated using (auth.uid() = user_id);
create policy "tracks: insert own" on public.tracks
  for insert to authenticated with check (auth.uid() = user_id);
create policy "tracks: update own" on public.tracks
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tracks: delete own" on public.tracks
  for delete to authenticated using (auth.uid() = user_id);

-- 2) 음성 파일 저장소 (비공개 버킷, 사용자별 폴더)
insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

drop policy if exists "audio: read own" on storage.objects;
drop policy if exists "audio: insert own" on storage.objects;
drop policy if exists "audio: update own" on storage.objects;
drop policy if exists "audio: delete own" on storage.objects;

create policy "audio: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio: insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
