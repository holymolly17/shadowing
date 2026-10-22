# 쉐도잉 플레이어

MP3와 스크립트를 올리면 음성에 맞춰 문장이 하이라이트되고, 문장을 누르면 그 부분부터 재생되는 쉐도잉 연습 앱입니다.
휴대폰·PC에 앱으로 설치할 수 있고(PWA), 같은 계정으로 로그인하면 자료가 함께 보입니다.

- 앱 주소: https://holymolly17.github.io/shadowing/
- 구성: GitHub Pages(앱) + Supabase(로그인, 자료·음성 저장)

## 기능

- 스크립트 자동 정렬: 한 줄에 한 문장을 넣으면 음성의 쉬는 구간을 분석해 문장 시작 시간을 맞춤
- 시간 표기 스크립트(`[00:12] 문장`), SRT·VTT·LRC 자막 지원
- 싱크 조정: 재생하며 탭으로 맞추기, 문장별 ±0.1초 조정
- 재생 속도 0.5–2.0배, 문장 반복, 따라 말하기(문장 끝마다 멈춤), 텍스트 가리기
- 한 번 재생한 음성은 기기에 저장되어 오프라인에서도 재생

## 처음 설정 (한 번만)

### 1. Supabase 프로젝트 만들기
1. https://supabase.com 에서 가입하고 **New project**를 만듭니다. (Region: Northeast Asia (Seoul) 권장)
2. 왼쪽 **SQL Editor** → **New query**에 `supabase/schema.sql` 내용을 전부 붙여 넣고 **Run**.
3. **Authentication → URL Configuration**의 **Site URL**을 `https://holymolly17.github.io/shadowing/` 로 바꿉니다.
   - 가입 확인 메일 없이 바로 쓰려면 **Authentication → Sign In / Providers → Email**에서 **Confirm email**을 끕니다.
4. **Project Settings → API**에서 **Project URL**과 **anon public** 키를 복사해 `config.js`에 넣습니다.

### 2. GitHub Pages 켜기
저장소 **Settings → Pages**에서 Source를 **Deploy from a branch**, Branch를 `main` / `(root)`로 저장합니다.
1–2분 뒤 앱 주소가 열립니다.

## 앱으로 설치하기

- **iPhone (Safari):** 앱 주소 열기 → 공유 버튼 → **홈 화면에 추가**
- **Android (Chrome):** 앱 주소 열기 → 메뉴(⋮) → **앱 설치** 또는 **홈 화면에 추가**
- **PC (Chrome·Edge):** 주소창 오른쪽의 설치 아이콘 → **설치**

## 참고

- Supabase 무료 플랜: 저장 공간 1GB, 파일 하나당 최대 50MB.
- `config.js`의 anon key는 공개용 키입니다. 자료는 RLS 정책으로 본인 계정만 읽고 쓸 수 있습니다.
- 코드를 수정한 뒤 설치된 앱에 반영이 늦으면 앱을 완전히 닫았다가 다시 여세요.
