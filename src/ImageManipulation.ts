/**
 * Image manipulation scripts
 */

import Spline from "cubic-spline-ts";

interface DecodingCanvas {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}

export function createDecodingCanvas(): DecodingCanvas {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  return { canvas, context };
}

export function applyToneCurve(
  imageData: ImageData,
  toneCurve: Spline
): ImageData {
  // const canvas = document.createElement("canvas");
  // const ctx = canvas.getContext("2d");

  // const imageData = await decode(canvas, ctx, bytes);
  const pixels = imageData.data;

  // Do the actual work of inverting the colors.
  for (let i = 0; i < pixels.length; i += 4) {
    const PIXEL_RED = i + 0;
    const PIXEL_GREEN = i + 1;
    const PIXEL_BLUE = i + 2;
    // const PIXEL_ALPHA = i + 3;

    pixels[PIXEL_RED] = toneCurve.at(pixels[PIXEL_RED] / 255) * 255;
    pixels[PIXEL_GREEN] = toneCurve.at(pixels[PIXEL_GREEN] / 255) * 255;
    pixels[PIXEL_BLUE] = toneCurve.at(pixels[PIXEL_BLUE] / 255) * 255;
    // Do nothing for the alpha channel
    // pixels[PIXEL_ALPHA] = pixels[PIXEL_ALPHA];
  }

  return new ImageData(pixels, imageData.width, imageData.height);

  // const newBytes: Uint8Array = await encode(canvas, ctx, imageData);

  // return newBytes;
}

// Encoding an image is also done by sticking pixels in an
// HTML canvas and by asking the canvas to serialize it into
// an actual PNG file via canvas.toBlob().
export async function encode(canvas, ctx, imageData): Promise<Uint8Array> {
  ctx.putImageData(imageData, 0, 0);
  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = () => reject(new Error("Could not read from blob"));
      reader.readAsArrayBuffer(blob);
    });
  });
}

// Decoding an image can be done by sticking it in an HTML
// canvas, as we can read individual pixels off the canvas.
export async function decode(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  bytes
): Promise<ImageData> {
  const url = URL.createObjectURL(new Blob([bytes]));
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject();
    img.src = url;
  });
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  return imageData;
}

export async function createImageFromByte(bytes): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([bytes]));
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject();
    img.src = url;
  });
  return image;
}
