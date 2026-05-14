# 직소퍼즐 PWA

> **▶ 지금 플레이: https://repo-red-sigma.vercel.app**
> 모바일 브라우저(Chrome / Safari)에서 열어주세요. "홈 화면에 추가"로 앱처럼 설치할 수 있어요.

모바일 한정 직소퍼즐 게임. 끝없이 이어지는 스테이지(999) — 사진을 그리드 안에서 드래그&드롭으로 자리를 바꿔가며 맞추고, 인접한 조각이 정답 위치 관계가 되면 자동으로 붙어서 한 덩어리로 같이 움직입니다.

## 스택

- **Next.js 16** (App Router) · React 19 · TypeScript
- **Tailwind 4**
- **Vercel** 배포 (main 푸시 = 자동 재배포)
- **Supabase** 클라이언트 스캐폴드 (선택 — env 미설정 시 자동 비활성)
- 데이터: `localStorage`만 사용 (서버/DB 비용 0)
- 이미지: **Picsum** (Unsplash 큐레이션, 무료 CDN, API 키 불필요)

## 게임 룰

- 그림이 N×M 그리드로 나뉘어 섞인 상태에서 시작
- 조각을 잡고 다른 칸으로 드롭 → 두 자리가 **스왑**
- 정답 인접 관계로 만나는 조각은 시각적으로 붙고, **한 덩어리로 같이 드래그**됨 (그룹 드래그)
- 모든 조각이 제 위치에 들어가면 클리어, 별 1~3개 부여 (시간 기준)

### 플레이 기능

- 💡 **힌트** (일반 3회, 보스 2회) — 잘못 놓인 조각 하나를 자기 자리로
- ↶ **되돌리기** (5회, 보스 3회) — 최근 스왑 되돌리기
- 🔀 **다시 섞기** — 2회 탭 확인 후 새로 섞기
- 👁 **미리보기** — 정답 그림을 30% 투명도로 오버레이
- ⏸ 백그라운드 진입 시 **자동 일시정지**
- 💾 **자동 저장 / 이어하기** — 닫았다가 다시 열어도 진행 복원
- 🎉 솔브 시 confetti + 보드 펄스 + 효과음
- 🔇 사운드 토글 (설정)
- 📋 진행도 공유 (Web Share API + 클립보드 폴백)

## 스테이지 구조

스테이지 999개. 10개의 named chapter(각 100 스테이지)로 나뉨. 10단위는 **보스** (큰 그리드, 핑크 링, BOSS 뱃지). 1번부터 순차 잠금 해제.

| Chapter | 범위 | 제목 |
|---------|------|-----|
| 1 | 1-100 | 따뜻한 시작 |
| 2 | 101-200 | 호기심 |
| 3 | 201-300 | 여정 |
| 4 | 301-400 | 도전 |
| 5 | 401-500 | 발견 |
| 6 | 501-600 | 깊이 |
| 7 | 601-700 | 변주 |
| 8 | 701-800 | 통찰 |
| 9 | 801-900 | 절정 |
| 10 | 901-999 | 마스터 |

그리드 크기는 5×4 → 8×6(보스 최대 9×7=63 조각)로 점진 증가.

### 보상 시스템

- ⭐ 별점 (시간 par 기준 1-3성)
- 🏆 신기록 + 💎 PERFECT (3성 + 힌트 0)
- 🎯 데일리 챌린지 — 매일 다른 스테이지, 연속 일수 트래킹
- 🌱 9 단계 업적 (1/10/50/100/500 클리어, 보스 1/10, 3성 1/10/50)

## 이미지 출처

- 일반 스테이지: `https://picsum.photos/seed/jigsaw-{id}/720/720` (시드 기반 결정적)
- 보스 1-10: 큐레이션된 Picsum 풍경 ID (1015, 1018, 1019, 1041, 1043, 1051, 1066, 1074, 1062, 1011)
- 보스 11+: `https://picsum.photos/seed/boss-{id}/720/720`

같은 시드는 매번 같은 사진 → 자동 저장과 미리 캐싱이 안정적.

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
- `public/sw.js` — 오프라인 캐시 (HTML network-first, 정적 + picsum cache-first)
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
│  └─ page.tsx
├─ components/
│  ├─ StageSelect.tsx
│  ├─ PuzzleBoard.tsx
│  ├─ Confetti.tsx
│  ├─ TutorialTip.tsx
│  ├─ SettingsSheet.tsx
│  ├─ StatsCard.tsx
│  ├─ AchievementsRow.tsx
│  ├─ DailyBanner.tsx
│  └─ ServiceWorkerRegister.tsx
├─ data/
│  ├─ stages.ts        # 999 stages + 10 chapters
│  └─ achievements.ts
└─ lib/
   ├─ seedRng.ts
   ├─ stageImage.ts    # Picsum URL builder
   ├─ progress.ts      # 클리어/별/잠금 영구 저장
   ├─ savedGame.ts     # 진행 중인 퍼즐 스냅샷
   ├─ daily.ts         # 데일리 챌린지
   ├─ sound.ts         # Web Audio 효과음
   └─ supabase/
```

## 작업 규칙

- `main` 브랜치에서만 작업 (자동 배포)
- 모바일 한정 — 데스크탑 반응형은 일부러 미지원
- 콘텐츠는 "infinity, not finite" 컨셉 (이미지 갈아끼우면 무한 확장)
