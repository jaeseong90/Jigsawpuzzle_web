# 직소퍼즐 PWA

내 사진으로 즐기는 모바일 직소퍼즐. Next.js + Supabase + Vercel 기반의 설치 가능한 PWA.

## 스택

- **Next.js 16 (App Router)** · React 19 · TypeScript
- **Tailwind CSS 4**
- **Supabase** (선택, 향후 점수/세션 동기화용 — 무료 티어)
- **Vercel** 배포

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 열기. 모바일 전용 레이아웃이므로 DevTools 모바일 에뮬레이션 권장.

## 환경 변수

Supabase 기능을 쓰려면 `.env.local.example`을 복사해 `.env.local` 생성:

```bash
cp .env.local.example .env.local
```

값은 Supabase 프로젝트의 **Settings → API**에서 가져온다. 변수를 채우지 않으면 클라이언트는 `null`을 반환하고 앱은 로컬 저장소만 사용한다.

## PWA

- `src/app/manifest.ts` — Next 16 metadata-route 방식 매니페스트
- `public/sw.js` — 기본 오프라인 캐시 (navigate는 network-first, 정적 자산은 cache-first)
- `public/icons/*.svg` — any · maskable 아이콘

배포 도메인이 HTTPS이면 모바일 브라우저에서 자동으로 "홈 화면에 추가" 프롬프트가 뜬다.

## 배포 (Vercel)

1. 이 레포를 Vercel에 import
2. 환경 변수 등록 (선택)
3. main 브랜치에 push → 자동 배포

## 디렉토리

```
src/
├─ app/
│  ├─ layout.tsx        # viewport / metadata / theme color
│  ├─ manifest.ts       # PWA manifest
│  ├─ icon.svg          # favicon
│  └─ page.tsx          # 메인 (StartScreen ↔ PuzzleBoard)
├─ components/
│  ├─ StartScreen.tsx
│  ├─ PuzzleBoard.tsx   # 모바일 터치/포인터 드래그 + 스냅
│  └─ ServiceWorkerRegister.tsx
└─ lib/
   ├─ storage.ts        # localStorage(사진/완료 기록)
   └─ supabase/         # 브라우저/서버 클라이언트
```

## 작업 규칙

- `main` 브랜치에서만 작업
- 모바일 한정 — 데스크탑 반응형 작업 없음
