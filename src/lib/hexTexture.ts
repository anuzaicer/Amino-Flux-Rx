/* Shared honeycomb background texture (About page + category hero). */

export const HEX_SIZE = 76;

export function hexPoints(cx: number, cy: number, r: number): string {
  const h = (Math.sqrt(3) / 2) * r;
  const pts: Array<[number, number]> = [
    [cx + r, cy],
    [cx + r / 2, cy - h],
    [cx - r / 2, cy - h],
    [cx - r, cy],
    [cx - r / 2, cy + h],
    [cx + r / 2, cy + h],
  ];
  return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

export function hexCells(originX: number, originY: number) {
  const cells: Array<{ points: string; opacity: number }> = [];
  const dx = 1.5 * HEX_SIZE;
  const dy = (Math.sqrt(3) / 2) * HEX_SIZE;
  for (let row = 0; row < 18; row++) {
    for (let col = 0; col < 20; col++) {
      const cx = col * dx + (row % 2 ? dx / 2 : 0);
      const cy = row * dy;
      const cornerDist = Math.sqrt(Math.pow(cx - originX, 2) + Math.pow(cy - originY, 2));
      const opacity = Math.max(0, 0.16 - cornerDist / 4600);
      if (opacity > 0.015) cells.push({ points: hexPoints(cx, cy, HEX_SIZE - 2), opacity });
    }
  }
  return cells;
}

/* Top-right and bottom-left corner clusters, fading away from the corner. */
export const HEX_TR = hexCells(1980, -50);
export const HEX_BL = hexCells(-50, 980);
