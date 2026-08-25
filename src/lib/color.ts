/** #rrggbb → "r, g, b" (canal cru, para compor rgba() em CSS). */
export function toRgbChannels(hex: string): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const value = Number.parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `${r}, ${g}, ${b}`;
}

export const withAlpha = (hex: string, alpha: number) => `rgba(${toRgbChannels(hex)}, ${alpha})`;
