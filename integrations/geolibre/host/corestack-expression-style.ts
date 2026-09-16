import { interpolateRampColors } from "@geolibre/core";

/** Recolor only the classifier; preserve numeric breaks and the missing branch. */
export function recolorCoreStackExpression(expression: string, palette: string, lightCrop = false): string | null {
  try {
    const parsed = JSON.parse(expression);
    const step = parsed?.[0] === "case" ? parsed[2] : null;
    if (!Array.isArray(step) || step[0] !== "step" || step.length < 5 || step.length % 2 !== 1) return null;
    const count = (step.length - 1) / 2;
    const colors = lightCrop && palette === "rdylgn" && count === 3
      ? interpolateRampColors(palette, 6).slice(2, 5)
      : interpolateRampColors(palette, count);
    for (let index = 0; index < count; index += 1) step[2 + index * 2] = colors[index];
    return JSON.stringify(parsed);
  } catch { return null; }
}
