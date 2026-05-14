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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-amber-900/55 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white px-5 py-5 shadow-xl">
        <div className="text-xl font-bold text-amber-900">놀이 방법</div>
        <ul className="mt-3 space-y-2 text-sm text-amber-900/90 leading-relaxed">
          <li>
            <b>드래그</b>해서 조각을 다른 칸으로 옮기면 두 조각의 자리가 바뀌어요.
          </li>
          <li>
            인접한 조각이 <b>정답 위치 관계</b>로 만나면 자동으로 붙어서 같이
            움직여요.
          </li>
          <li>
            막히면 <b>💡 힌트</b>, 처음부터 다시 하려면 <b>🔀 다시 섞기</b>를
            눌러요.
          </li>
        </ul>
        <button
          type="button"
          onClick={dismiss}
          className="mt-5 w-full rounded-full bg-amber-700 py-3 text-white font-semibold active:scale-[0.97] transition-transform"
        >
          시작하기
        </button>
      </div>
    </div>
  );
}
