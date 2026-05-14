// Reads a user-selected image File and returns a downscaled JPEG data URL.
// Phones routinely produce 4000×3000+ photos; using them as raw
// background-images would balloon memory on the puzzle board. We resample
// to a max longest-side that matches the in-app stage images (720px).

const MAX_SIDE = 720;
const QUALITY = 0.86;

export async function imageFileToDataUrl(file: File): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Not in a browser");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    return resampleToDataUrl(img);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.decoding = "async";
    img.src = src;
  });
}

function resampleToDataUrl(img: HTMLImageElement): string {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const longest = Math.max(w, h);
  const scale = longest > MAX_SIDE ? MAX_SIDE / longest : 1;
  const targetW = Math.max(1, Math.round(w * scale));
  const targetH = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetW, targetH);
  return canvas.toDataURL("image/jpeg", QUALITY);
}
