"use client";

import { useEffect, useState } from "react";
import { clearSavedGame } from "@/lib/savedGame";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound";
import StatsCard from "./StatsCard";

const TUTORIAL_SEEN_KEY = "jigsaw:tutorial-seen";

type Props = {
  open: boolean;
  onClose: () => void;
  onResetProgress: () => void;
};

export default function SettingsSheet({ open, onClose, onResetProgress }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoundOn(isSoundEnabled());
  }, [open]);

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
          <StatsCard />

          <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-amber-900">소리</div>
              <div className="text-[11px] text-amber-700/70">스냅 / 완성 효과음</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={soundOn}
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                setSoundEnabled(next);
              }}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                soundOn ? "bg-amber-700" : "bg-amber-200"
              }`}
            >
              <span
                className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all"
                style={{ left: soundOn ? "calc(100% - 1.625rem)" : "0.125rem" }}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem(TUTORIAL_SEEN_KEY);
              } catch {
                /* ignore */
              }
              onClose();
              // The tutorial component checks the flag on mount; reload to pop the
              // sheet stack cleanly and re-trigger the modal.
              if (typeof window !== "undefined") window.location.reload();
            }}
            className="w-full rounded-xl bg-amber-50 text-amber-900 border border-amber-200 px-4 py-3 text-sm font-semibold text-left"
          >
            📖 놀이 방법 다시 보기
          </button>

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
          직소퍼즐 PWA · 끝없는 스테이지 ∞
        </div>
      </div>
    </div>
  );
}
