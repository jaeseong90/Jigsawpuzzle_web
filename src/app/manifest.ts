import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tessera — 조각의 시간",
    short_name: "Tessera",
    description:
      "성인을 위한 미니멀 직소퍼즐. 조용히 한 조각씩 자리를 찾아가는 시간.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f1ea",
    theme_color: "#16120e",
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
