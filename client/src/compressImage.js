// Photos straight off a phone are often 4-12 MB, which blows past Vercel's
// 4.5 MB serverless body limit. GPT-4o vision doesn't need full resolution, so
// we downscale to a reasonable max dimension and re-encode as JPEG before upload.
const MAX_DIMENSION = 1536;
const JPEG_QUALITY = 0.85;

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image file."));
    img.src = dataUrl;
  });
}

/**
 * Downscale and re-encode an image file for upload.
 * Falls back to the original file if it can't be decoded (e.g. SVG, GIF).
 */
export async function compressImage(file) {
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  const original = await loadImage(URL.createObjectURL(file));

  const scale = Math.min(1, MAX_DIMENSION / Math.max(original.width, original.height));
  const width = Math.round(original.width * scale);
  const height = Math.round(original.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(original, 0, 0, width, height);

  const blob = await canvasToBlob(canvas);

  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, {
    type: "image/jpeg",
  });
}

/**
 * canvas.toDataURL() returns a base64 *string*, which new File() would wrap as
 * plain text and render as a broken image. Convert it to a real binary Blob.
 */
function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the image."))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}
