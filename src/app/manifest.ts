import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "직소퍼즐",
    short_name: "직소퍼즐",
    description: "끝없는 스테이지의 모바일 직소퍼즐 — 한 칸씩 자리를 바꿔가며 그림을 완성하세요",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdf6ee",
    theme_color: "#b45309",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
