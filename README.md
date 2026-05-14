# 직소퍼즐 PWA

모바일 한정 직소퍼즐 게임. 100 스테이지 — 사진을 그리드 안에서 드래그&드롭으로 자리를 바꿔가며 맞추고, 인접한 조각이 정답 위치 관계가 되면 자동으로 붙어서 한 덩어리로 같이 움직입니다.

라이브: https://repo-red-sigma.vercel.app

## 스택

- **Next.js 16** (App Router) · React 19 · TypeScript
- **Tailwind 4**
- **Vercel** 배포 (main 푸시 = 자동 재배포)
- **Supabase** 클라이언트 스캐폴드 (선택 — env 미설정 시 자동 비활성)
- 데이터: `localStorage`만 사용 (서버/DB 비용 0)

## 게임 룰

- 그림이 N×M 그리드로 나뉘어 섞인 상태에서 시작
- 조각을 잡고 다른 칸으로 드롭 → 두 자리 자리가 **스왑**
- 정답 인접 관계로 만나는 조각은 시각적으로 붙고, **한 덩어리로 같이 드래그**됨 (그룹 드래그)
- 모든 조각이 제 위치에 들어가면 클리어, 별 1~3개 부여 (시간 기준)

### 추가 기능

- 💡 **힌트** (일반 3회, 보스 2회) — 잘못 놓인 조각 하나를 자기 자리로
- 🔀 **다시 섞기** — 타이머/힌트 초기화 후 새로 섞기
- 👁 **미리보기** — 정답 그림을 30% 투명도로 오버레이
- ⏸ 백그라운드 진입 시 **자동 일시정지**
- 💾 **자동 저장 / 이어하기** — 닫았다가 다시 열어도 진행 상태 복원
- 🎉 솔브 시 confetti + 보드 펄스 + 효과음
- 🔇 사운드 토글 (설정 시트)

## 스테이지 구조

100 스테이지를 10 chapter × 10 스테이지로 분할. 각 chapter의 10번째는 **보스** (큰 그리드, 핑크 링, BOSS 뱃지). 1번부터 순차 잠금 해제.

| Chapter | 범위 | 제목 |
|---------|------|-----|
| 1 | 1-10 | 따뜻한 시작 |
| 2 | 11-20 | 호기심 |
| 3 | 21-30 | 여정 |
| 4 | 31-40 | 도전 |
| 5 | 41-50 | 발견 |
| 6 | 51-60 | 깊이 |
| 7 | 61-70 | 변주 |
| 8 | 71-80 | 통찰 |
| 9 | 81-90 | 절정 |
| 10 | 91-100 | 마스터 |

그리드 크기는 단계별로 3×3 → 7×5(보스 최대 8×6)로 점진적으로 증가.

## 이미지 생성

100장의 스테이지 이미지는 모두 **결정적 SVG 생성**(저작권/용량 0):

- 패턴 10종: circles, rects, triangles, stripes, mountain, heart, flower, star, bubbles, waves
- 팔레트 24종 (amber/rose/emerald/blue/violet/pink/...)
- 시드 = stage id로 같은 스테이지는 항상 같은 그림

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 — 모바일 viewport 권장 (DevTools).

## 환경 변수 (선택)

```bash
cp .env.local.example .env.local
# Supabase 사용 시
# NEXT_PUBLIC_SUPABASE_URL=
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

값이 없으면 클라이언트는 `null`을 반환하고 앱은 정상 동작 (로컬 진행도만 사용).

## PWA

- `app/manifest.ts` — Next 16 metadata-route 매니페스트
- `public/sw.js` — 오프라인 캐시 (HTML network-first, 정적 cache-first)
- SVG 아이콘 (any + maskable) + apple-touch-icon

HTTPS 배포 후 모바일 브라우저에서 "홈 화면에 추가" 자동 프롬프트.

## 디렉토리

```
src/
├─ app/
│  ├─ layout.tsx
│  ├─ manifest.ts
│  ├─ globals.css
│  ├─ icon.svg
│  └─ page.tsx        # stage-select ↔ puzzle 라우팅
├─ components/
│  ├─ StageSelect.tsx
│  ├─ PuzzleBoard.tsx # 그리드 스와프 + 그룹 드래그
│  ├─ Confetti.tsx
│  ├─ TutorialTip.tsx
│  ├─ SettingsSheet.tsx
│  └─ ServiceWorkerRegister.tsx
├─ data/
│  └─ stages.ts       # 100 스테이지 + chapter 정의
└─ lib/
   ├─ seedRng.ts
   ├─ stageImage.ts   # 10 SVG 패턴 generator
   ├─ progress.ts     # 클리어/별/잠금 영구 저장
   ├─ savedGame.ts    # 진행 중인 퍼즐 스냅샷
   ├─ sound.ts        # Web Audio 효과음
   └─ supabase/       # 브라우저/서버 클라이언트 (선택)
```

## 작업 규칙

- `main` 브랜치에서만 작업
- 모바일 한정 — 데스크탑 반응형은 일부러 미지원
