import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "직소퍼즐",
    short_name: "직소퍼즐",
    description: "내 사진으로 즐기는 직소퍼즐",
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
