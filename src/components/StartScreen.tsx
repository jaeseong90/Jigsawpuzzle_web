"use client";

import { useEffect, useRef, useState } from "react";
import { loadLastImage, saveLastImage } from "@/lib/storage";

type Difficulty = { label: string; rows: number; cols: number };

const DIFFICULTIES: Difficulty[] = [
  { label: "쉬움 (3×4)", rows: 4, cols: 3 },
  { label: "보통 (4×5)", rows: 5, cols: 4 },
  { label: "어려움 (5×7)", rows: 7, cols: 5 },
];

type Props = {
  onStart: (imageSrc: string, rows: number, cols: number) => void;
};

export default function StartScreen({ onStart }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [difficultyIdx, setDifficultyIdx] = useState<number>(0);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Load cached image after mount to avoid SSR/client hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageSrc(loadLastImage());
  }, []);

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) return;
      setImageSrc(result);
      saveLastImage(result);
    };
    reader.readAsDataURL(file);
  }

  const diff = DIFFICULTIES[difficultyIdx];

  return (
    <main className="flex min-h-[100dvh] flex-col items-center px-5 py-6">
      <h1 className="text-2xl font-bold text-amber-900">직소퍼즐</h1>
      <p className="mt-1 text-sm text-amber-800/80">내 사진으로 만드는 직소퍼즐</p>

      <div className="mt-6 w-full max-w-md">
        <label className="block text-sm font-medium text-amber-900 mb-2">사진</label>
        <div
          className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm border border-amber-200"
          onClick={() => fileRef.current?.click()}
          role="button"
        >
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- data: URLs aren't friendly to next/image
            <img
              src={imageSrc}
              alt="선택한 사진"
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="text-center text-amber-700/80 px-6">
              <div className="text-4xl">📷</div>
              <div className="mt-2 text-sm">탭해서 사진을 골라주세요</div>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        {imageSrc && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2 w-full rounded-full bg-white py-2 text-sm font-medium text-amber-900 shadow-sm border border-amber-200"
          >
            다른 사진 고르기
          </button>
        )}
      </div>

      <div className="mt-6 w-full max-w-md">
        <label className="block text-sm font-medium text-amber-900 mb-2">난이도</label>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((d, i) => (
            <button
              type="button"
              key={d.label}
              onClick={() => setDifficultyIdx(i)}
              className={`rounded-xl py-3 text-sm font-medium transition-colors border ${
                i === difficultyIdx
                  ? "bg-amber-700 text-white border-amber-700"
                  : "bg-white text-amber-900 border-amber-200"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={!imageSrc}
        onClick={() => imageSrc && onStart(imageSrc, diff.rows, diff.cols)}
        className="mt-8 w-full max-w-md rounded-full bg-amber-700 py-4 text-base font-semibold text-white shadow-sm disabled:bg-amber-300 disabled:text-white/70"
      >
        시작하기
      </button>

      <p className="mt-6 text-center text-xs text-amber-700/70 max-w-md">
        사진은 기기 안에만 저장돼요. 홈 화면에 추가하면 앱처럼 사용할 수 있어요.
      </p>
    </main>
  );
}
