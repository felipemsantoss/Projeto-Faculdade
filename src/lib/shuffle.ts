/** Fisher-Yates sobre uma cópia — nunca muta a lista recebida. */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Interpolação linear usada nos loops de animação em rAF. */
export const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
