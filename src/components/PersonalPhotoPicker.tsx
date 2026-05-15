"use client";

import { useEffect, useRef, useState } from "react";
import { imageFileToDataUrl } from "@/lib/personalPhoto";
import { addPersonalPhoto } from "@/lib/personalLibrary";
import { useBackButton } from "@/lib/backNav";

type PieceChoice = { rows: number; cols: number; label: string; pieces: number };

const CHOICES: ReadonlyArray<PieceChoice> = [
  { rows: 4, cols: 4, pieces: 16, label: "릴랙스" },
  { rows: 5, cols: 5, pieces: 25, label: "가벼움" },
  { rows: 6, cols: 6, pieces: 36, label: "스탠다드" },
  { rows: 7, cols: 7, pieces: 49, label: "도전" },
  { rows: 8, cols: 8, pieces: 64, label: "마스터" },
  { rows: 9, cols: 9, pieces: 81, label: "장인" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onStart: (opts: {
    imageSrc: string;
    rows: number;
    cols: number;
    rotate: boolean;
    photoId: string;
  }) => void;
};

export default function PersonalPhotoPicker({ open, onClose, onStart }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choiceIdx, setChoiceIdx] = useState(2);
  const [rotate, setRotate] = useState(false);

  // Back press from the picker dismisses to the previous screen. If the user
  // already picked a photo and is on the config step, back returns to the
  // photo-pick step instead of closing.
  useBackButton(open && !!imageSrc, () => setImageSrc(null));
  useBackButton(open && !imageSrc, onClose);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageSrc(null);
    setError(null);
    setLoading(false);
    setChoiceIdx(2);
    setRotate(false);
  }, [open]);

  if (!open) return null;

  const handlePick = () => inputRef.current?.click();
  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const url = await imageFileToDataUrl(file);
      setImageSrc(url);
    } catch {
      setError("이미지를 불러오지 못했어요. 다른 사진으로 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const choice = CHOICES[choiceIdx];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 fade-in-soft"
      style={{ background: "var(--bg-overlay)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl px-5 py-5"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--line)",
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div
              className="text-[11px] uppercase tracking-[0.18em] font-bold"
              style={{ color: "var(--ink-mute)" }}
            >
              My Photo
            </div>
            <div
              className="text-lg font-semibold"
              style={{ color: "var(--ink-1)" }}
            >
              내 사진으로 만들기
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
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

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {!imageSrc ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={handlePick}
              disabled={loading}
              className="press-95 w-full rounded-2xl py-10 px-4 text-center"
              style={{
                background: "var(--bg-elevated)",
                border: "1px dashed var(--line)",
                color: "var(--ink-2)",
              }}
            >
              {loading ? (
                <div className="text-sm">불러오는 중…</div>
              ) : (
                <>
                  <div className="text-lg font-semibold">사진 가져오기</div>
                  <div
                    className="mt-1 text-[11px]"
                    style={{ color: "var(--ink-mute)" }}
                  >
                    갤러리에서 한 장 골라주세요
                  </div>
                </>
              )}
            </button>
            {error && (
              <div
                className="mt-3 text-[12px] text-center"
                style={{ color: "var(--danger)" }}
              >
                {error}
              </div>
            )}
            <div
              className="mt-3 text-[11px]"
              style={{ color: "var(--ink-mute)" }}
            >
              사진은 기기 안에서만 처리돼요. 서버로 올라가지 않아요.
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div
              className="relative w-full overflow-hidden rounded-xl"
              style={{ aspectRatio: 1, background: "var(--bg-elevated)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                decoding="async"
              />
              <div
                className="pointer-events-none absolute inset-0"
                aria-hidden
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(255,255,255,0.32) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255,255,255,0.32) 1px, transparent 1px)
                  `,
                  backgroundSize: `${100 / choice.cols}% ${100 / choice.rows}%`,
                  mixBlendMode: "screen",
                  transition: "background-size 220ms ease",
                }}
              />
              <button
                type="button"
                onClick={() => setImageSrc(null)}
                className="press-95 absolute top-2 right-2 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  background: "var(--bg-surface)",
                  color: "var(--ink-2)",
                  border: "1px solid var(--line)",
                }}
              >
                바꾸기
              </button>
            </div>

            <div>
              <div
                className="text-[11px] tracking-[0.16em] uppercase font-semibold mb-2"
                style={{ color: "var(--ink-mute)" }}
              >
                조각 수
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {CHOICES.map((c, i) => {
                  const selected = choiceIdx === i;
                  return (
                    <button
                      key={c.pieces}
                      type="button"
                      onClick={() => setChoiceIdx(i)}
                      className="press-95 rounded-lg px-2 py-2 text-center"
                      style={{
                        background: selected
                          ? "var(--accent)"
                          : "var(--bg-elevated)",
                        color: selected
                          ? "var(--accent-fg)"
                          : "var(--ink-2)",
                        border: `1px solid ${
                          selected ? "var(--accent)" : "var(--line)"
                        }`,
                      }}
                    >
                      <div className="text-[13px] font-bold tabular-nums">
                        {c.pieces}
                      </div>
                      <div
                        className="text-[10px] mt-0.5"
                        style={{
                          color: selected
                            ? "rgba(255,255,255,0.78)"
                            : "var(--ink-mute)",
                        }}
                      >
                        {c.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="flex items-center justify-between rounded-xl px-3 py-2.5"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--line)",
              }}
            >
              <div>
                <div
                  className="text-sm font-semibold"
                  style={{ color: "var(--ink-1)" }}
                >
                  회전 시작
                </div>
                <div
                  className="text-[11px]"
                  style={{ color: "var(--ink-mute)" }}
                >
                  조각이 무작위 각도로 시작 — 탭으로 90° 회전
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={rotate}
                onClick={() => setRotate((v) => !v)}
                className="relative h-7 w-12 rounded-full transition-colors"
                style={{
                  background: rotate ? "var(--accent)" : "var(--bg-surface)",
                  border: "1px solid var(--line)",
                }}
              >
                <span
                  className="absolute top-0.5 h-6 w-6 rounded-full shadow transition-all"
                  style={{
                    background: rotate
                      ? "var(--accent-fg)"
                      : "var(--bg-surface)",
                    left: rotate ? "calc(100% - 1.625rem)" : "0.125rem",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  }}
                />
              </button>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                if (!imageSrc) return;
                setLoading(true);
                try {
                  const entry = await addPersonalPhoto(imageSrc, {
                    rows: choice.rows,
                    cols: choice.cols,
                    rotate,
                  });
                  onStart({
                    imageSrc,
                    rows: choice.rows,
                    cols: choice.cols,
                    rotate,
                    photoId: entry.id,
                  });
                } catch {
                  setError("사진을 저장하지 못했어요. 다시 시도해 주세요.");
                  setLoading(false);
                }
              }}
              className="press-95 w-full rounded-full py-3 text-sm font-semibold"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              시작하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
