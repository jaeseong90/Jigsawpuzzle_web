"use client";

import { useEffect, useState } from "react";
import { clearSavedGame } from "@/lib/savedGame";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound";
import { loadProgress } from "@/lib/progress";
import { loadTheme, saveTheme, type Theme } from "@/lib/theme";
import {
  DIFFICULTIES,
  loadDefaultDifficulty,
  saveDefaultDifficulty,
  type Difficulty,
} from "@/lib/difficulty";
import StatsCard from "./StatsCard";
import PhotoGallery from "./PhotoGallery";
import DailyCalendar from "./DailyCalendar";

const TUTORIAL_SEEN_KEY = "jigsaw:tutorial-seen";

async function shareProgress(): Promise<"shared" | "copied" | "noop"> {
  if (typeof window === "undefined") return "noop";
  const progress = loadProgress();
  const cleared = Object.keys(progress.cleared).length;
  const stars = Object.values(progress.bestStars).reduce((a, b) => a + b, 0);
  const url = window.location.origin;
  const text = `TESSERA · 조각의 시간\n${cleared} 스테이지 클리어 · ★ ${stars}\n${url}`;
  try {
    type ShareNav = Navigator & {
      share?: (d: { title?: string; text?: string; url?: string }) => Promise<void>;
    };
    const nav = navigator as ShareNav;
    if (nav.share) {
      await nav.share({ title: "Tessera — 조각의 시간", text, url });
      return "shared";
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }
  } catch {
    /* user cancelled or unsupported */
  }
  return "noop";
}

type Props = {
  open: boolean;
  onClose: () => void;
  onResetProgress: () => void;
};

export default function SettingsSheet({ open, onClose, onResetProgress }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [theme, setTheme] = useState<Theme>("system");
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoundOn(isSoundEnabled());
    setTheme(loadTheme());
    setDifficulty(loadDefaultDifficulty());
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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
      style={{ background: "var(--bg-overlay)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl px-5 py-5"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--line)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div
              className="text-[11px] uppercase tracking-[0.18em] font-bold"
              style={{ color: "var(--ink-mute)" }}
            >
              Settings
            </div>
            <div
              className="text-lg font-semibold"
              style={{ color: "var(--ink-1)" }}
            >
              설정
            </div>
          </div>
          <button
            type="button"
            onClick={cancel}
            className="press-95 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
            }}
          >
            닫기
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <StatsCard />

          <Row label="모양" hint="테마">
            <ThemeToggle value={theme} onChange={(t) => {
              setTheme(t);
              saveTheme(t);
            }} />
          </Row>

          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--line)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div
                  className="text-sm font-semibold"
                  style={{ color: "var(--ink-1)" }}
                >
                  난이도
                </div>
                <div
                  className="text-[11px]"
                  style={{ color: "var(--ink-mute)" }}
                >
                  스테이지 시작 시 적용되는 기본값
                </div>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
              {DIFFICULTIES.map((d) => {
                const selected = difficulty === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setDifficulty(d.id);
                      saveDefaultDifficulty(d.id);
                    }}
                    className="press-95 rounded-lg px-2 py-2 text-center"
                    style={{
                      background: selected
                        ? "var(--accent)"
                        : "var(--bg-surface)",
                      color: selected
                        ? "var(--accent-fg)"
                        : "var(--ink-2)",
                      border: `1px solid ${
                        selected ? "var(--accent)" : "var(--line)"
                      }`,
                    }}
                    aria-pressed={selected}
                  >
                    <div className="text-[12px] font-semibold leading-tight">
                      {d.ko}
                    </div>
                    <div
                      className="text-[9px] tracking-[0.14em] mt-0.5"
                      style={{
                        color: selected
                          ? "rgba(255,255,255,0.78)"
                          : "var(--ink-mute)",
                      }}
                    >
                      ×{d.xpMultiplier.toFixed(1)} XP
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Row label="소리" hint="스냅 / 완성 효과음">
            <button
              type="button"
              role="switch"
              aria-checked={soundOn}
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                setSoundEnabled(next);
              }}
              className="relative h-7 w-12 rounded-full transition-colors"
              style={{
                background: soundOn ? "var(--accent)" : "var(--bg-elevated)",
                border: "1px solid var(--line)",
              }}
            >
              <span
                className="absolute top-0.5 h-6 w-6 rounded-full shadow transition-all"
                style={{
                  background: "var(--bg-surface)",
                  left: soundOn ? "calc(100% - 1.625rem)" : "0.125rem",
                }}
              />
            </button>
          </Row>

          <ActionRow label="갤러리" hint="완성한 그림 다시 보기" onClick={() => setGalleryOpen(true)} />
          <ActionRow label="일일 캘린더" hint="이번 달 도전 기록" onClick={() => setCalendarOpen(true)} />

          <ActionRow
            label="진행도 공유"
            hint="현재 클리어/별 수 복사"
            onClick={async () => {
              const result = await shareProgress();
              if (result === "shared") setShareToast(null);
              else if (result === "copied") setShareToast("진행도가 복사됐어요");
              else setShareToast("공유를 지원하지 않는 환경이에요");
              setTimeout(() => setShareToast(null), 1800);
            }}
          />

          <ActionRow
            label="놀이 방법 다시 보기"
            hint="튜토리얼 재표시"
            onClick={() => {
              try {
                localStorage.removeItem(TUTORIAL_SEEN_KEY);
              } catch {
                /* ignore */
              }
              onClose();
              if (typeof window !== "undefined") window.location.reload();
            }}
          />

          <button
            type="button"
            onClick={handleReset}
            className="press-95 w-full rounded-xl px-4 py-3 text-sm font-semibold text-left"
            style={
              confirming
                ? { background: "var(--danger)", color: "#fff" }
                : {
                    background: "var(--bg-elevated)",
                    color: "var(--ink-2)",
                    border: "1px solid var(--line)",
                  }
            }
          >
            {confirming ? "정말 모두 초기화할까요? (다시 누르기)" : "진행도 초기화"}
          </button>
          <div className="text-[11px]" style={{ color: "var(--ink-mute)" }}>
            모든 스테이지 클리어 기록과 별, 진행 중인 퍼즐이 사라져요. 잠금이
            풀린 스테이지도 다시 1번부터 시작해야 해요.
          </div>
        </div>

        <div
          className="mt-5 text-center text-[10px] tracking-[0.28em] font-semibold"
          style={{ color: "var(--ink-mute)" }}
        >
          TESSERA · 끝없는 길
        </div>
        {shareToast && (
          <div
            className="mt-2 text-center text-xs"
            style={{ color: "var(--ink-3)" }}
          >
            {shareToast}
          </div>
        )}
      </div>

      <PhotoGallery open={galleryOpen} onClose={() => setGalleryOpen(false)} />
      <DailyCalendar open={calendarOpen} onClose={() => setCalendarOpen(false)} />
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--line)" }}
    >
      <div>
        <div
          className="text-sm font-semibold"
          style={{ color: "var(--ink-1)" }}
        >
          {label}
        </div>
        {hint && (
          <div
            className="text-[11px]"
            style={{ color: "var(--ink-mute)" }}
          >
            {hint}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function ActionRow({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press-95 w-full rounded-xl px-4 py-3 text-left flex items-center justify-between"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--line)" }}
    >
      <div>
        <div
          className="text-sm font-semibold"
          style={{ color: "var(--ink-1)" }}
        >
          {label}
        </div>
        {hint && (
          <div
            className="text-[11px]"
            style={{ color: "var(--ink-mute)" }}
          >
            {hint}
          </div>
        )}
      </div>
      <span style={{ color: "var(--ink-mute)" }}>›</span>
    </button>
  );
}

function ThemeToggle({
  value,
  onChange,
}: {
  value: Theme;
  onChange: (t: Theme) => void;
}) {
  const options: Array<{ id: Theme; label: string }> = [
    { id: "light", label: "라이트" },
    { id: "system", label: "시스템" },
    { id: "dark", label: "다크" },
  ];
  return (
    <div
      className="flex rounded-full p-0.5"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--line)" }}
    >
      {options.map((o) => {
        const selected = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-full"
            style={{
              background: selected ? "var(--accent)" : "transparent",
              color: selected ? "var(--accent-fg)" : "var(--ink-mute)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
