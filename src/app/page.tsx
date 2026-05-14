"use client";

import { useState } from "react";
import StartScreen from "@/components/StartScreen";
import PuzzleBoard from "@/components/PuzzleBoard";
import { saveCompletion } from "@/lib/storage";

type Game = { imageSrc: string; rows: number; cols: number };

export default function Home() {
  const [game, setGame] = useState<Game | null>(null);

  if (!game) {
    return (
      <StartScreen
        onStart={(imageSrc, rows, cols) => setGame({ imageSrc, rows, cols })}
      />
    );
  }

  return (
    <PuzzleBoard
      imageSrc={game.imageSrc}
      rows={game.rows}
      cols={game.cols}
      onSolved={(durationMs) =>
        saveCompletion({
          rows: game.rows,
          cols: game.cols,
          durationMs,
          finishedAt: Date.now(),
        })
      }
      onExit={() => setGame(null)}
    />
  );
}
