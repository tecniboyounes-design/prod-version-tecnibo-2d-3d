export function computeMargin(depth = 0, unit = "px", multiplier = 20) {
  return `${depth * multiplier}${unit}`;
}
