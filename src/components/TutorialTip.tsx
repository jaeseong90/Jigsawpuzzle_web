"use client";

import { useEffect, useState } from "react";
import { hasSeenTutorial, markTutorialSeen } from "@/lib/progress";
import { useBackButton } from "@/lib/backNav";

export default function TutorialTip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!hasSeenTutorial()) setVisible(true);
  }, []);

  const dismiss = () => {
    markTutorialSeen();
    setVisible(false);
  };

  useBackButton(visible, dismiss);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 fade-in-soft"
      style={{ background: "var(--bg-overlay)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl px-5 py-5"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--line)",
        }}
      >
        <div
          className="text-[11px] tracking-[0.18em] uppercase font-bold"
          style={{ color: "var(--ink-mute)" }}
        >
          How to play
        </div>
        <div
          className="mt-1 text-xl font-semibold"
          style={{ color: "var(--ink-1)" }}
        >
          잠깐만, 놀이 방법
        </div>
        <ul
          className="mt-3 space-y-2.5 text-sm leading-relaxed"
          style={{ color: "var(--ink-2)" }}
        >
          <li>
            <b style={{ color: "var(--ink-1)" }}>드래그</b>로 조각을 옮기면 두
            칸의 자리가 바뀌어요. 정답 위치로 인접하면 자동으로 붙어요.
          </li>
          <li>
            막히면 <b style={{ color: "var(--ink-1)" }}>힌트</b>, 그림이 보고
            싶으면 <b style={{ color: "var(--ink-1)" }}>미리보기</b>, 잠시
            멈추려면 <b style={{ color: "var(--ink-1)" }}>일시정지</b>.
          </li>
          <li>
            홈의 <b style={{ color: "var(--ink-1)" }}>＋</b> 버튼으로 내 사진을
            퍼즐로 만들고, <b style={{ color: "var(--ink-1)" }}>◧</b> 갤러리에서
            완성한 그림과 내 사진을 다시 풀 수 있어요.
          </li>
          <li>
            매일 새로운 <b style={{ color: "var(--ink-1)" }}>오늘의 도전</b>이
            기다려요. 3·7·14·30일 연속으로 풀면 보너스 XP와 배지를 받아요.
          </li>
          <li>
            난이도는 <b style={{ color: "var(--ink-1)" }}>설정</b>에서 정해요.
            마스터에서는 조각이 회전된 채 시작 — 회전된 조각을{" "}
            <b style={{ color: "var(--ink-1)" }}>탭</b>하면 90°씩 돌아가요.
          </li>
        </ul>
        <button
          type="button"
          onClick={dismiss}
          className="press-95 mt-5 w-full rounded-full py-3 text-sm font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          시작하기
        </button>
      </div>
    </div>
  );
}
