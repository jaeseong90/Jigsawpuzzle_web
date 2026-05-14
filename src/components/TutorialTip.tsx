"use client";

import { useEffect, useState } from "react";
import { hasSeenTutorial, markTutorialSeen } from "@/lib/progress";

export default function TutorialTip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!hasSeenTutorial()) setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    markTutorialSeen();
    setVisible(false);
  };

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
            칸의 자리가 바뀌어요.
          </li>
          <li>
            인접한 조각이 정답 위치 관계로 만나면 자동으로 붙어서 같이
            움직여요.
          </li>
          <li>
            막히면 <b style={{ color: "var(--ink-1)" }}>힌트</b>, 보고 싶으면{" "}
            <b style={{ color: "var(--ink-1)" }}>미리보기</b>, 잠시 멈추려면{" "}
            <b style={{ color: "var(--ink-1)" }}>일시정지</b>.
          </li>
          <li>
            난이도는 시작 전에 <b style={{ color: "var(--ink-1)" }}>릴랙스 /
            스탠다드 / 마스터</b>로 고를 수 있어요.
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
