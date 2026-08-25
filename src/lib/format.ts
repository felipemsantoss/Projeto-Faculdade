const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const formatPrice = (value: number) => BRL.format(value);

/** Dois dígitos — usado nos contadores editoriais (01 / 08). */
export const pad2 = (value: number) => String(value).padStart(2, '0');

/** Segundos → mm:ss. */
export const formatClock = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${pad2(minutes)}:${pad2(seconds)}`;
};

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');
