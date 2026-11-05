import "server-only";
import sharp from "sharp";

const MAX_INPUT_PIXELS = 25_000_000;
const MAX_SIDE = 2000;
const ACCEPTED_FORMATS = ["png", "jpeg", "webp"];

/**
 * Re-encodes the upload, so what gets stored and served is always a plain image, whatever
 * the file claimed to be. Returns null if it isn't an accepted, readable image.
 */
export async function prepareMapImage(input: Buffer) {
  try {
    const image = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS });
    const { format } = await image.metadata();
    if (!ACCEPTED_FORMATS.includes(format)) return null;

    const { data, info } = await image
      .rotate()
      .resize({
        width: MAX_SIDE,
        height: MAX_SIDE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    return null;
  }
}
