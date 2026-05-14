"use client";

import { useState } from "react";
import { clearSavedGame } from "@/lib/savedGame";

type Props = {
  open: boolean;
  onClose: () => void;
  onResetProgress: () => void;
};

export default function SettingsSheet({ open, onClose, onResetProgress }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (!open) return null;

  const cancel = () => {
    setConfirming(false);
    onClose();
  };

  const handleReset = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    // Wipe all progress + any in-flight snapshot.
    try {
      localStorage.removeItem("jigsaw:progress:v2");
    } catch {
      /* ignore */
    }
    clearSavedGame();
    setConfirming(false);
    onResetProgress();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-amber-900/55 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white px-5 py-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold text-amber-900">설정</div>
          <button
            type="button"
            onClick={cancel}
            className="rounded-full bg-amber-50 text-amber-900 px-3 py-1 text-xs font-medium"
          >
            닫기
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={handleReset}
            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-left transition-colors ${
              confirming
                ? "bg-rose-600 text-white"
                : "bg-amber-50 text-amber-900 border border-amber-200"
            }`}
          >
            {confirming ? "정말 모두 초기화할까요? (다시 누르기)" : "🗑 진행도 초기화"}
          </button>
          <div className="text-[11px] text-amber-700/70 leading-relaxed">
            모든 스테이지 클리어 기록과 별, 진행 중인 퍼즐이 사라져요.
            잠금이 풀린 스테이지도 다시 1번부터 시작해야 해요.
          </div>
        </div>

        <div className="mt-5 text-center text-[11px] text-amber-700/60">
          직소퍼즐 PWA · 100 스테이지
        </div>
      </div>
    </div>
  );
}
