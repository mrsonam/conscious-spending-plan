/** SVG polyline `points` for a value series, scaled to width/height with optional vertical padding. */
export function computeSparklinePoints(
  values: number[],
  width: number,
  height: number,
  padY = 0,
): string {
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const flat = max <= 0 || max === min
  return values
    .map((v, i) => {
      const x = values.length <= 1 ? width / 2 : (i / (values.length - 1)) * width
      const y = flat
        ? height / 2
        : padY + (1 - (v - min) / (max - min)) * (height - padY * 2)
      return `${x},${y}`
    })
    .join(" ")
}
