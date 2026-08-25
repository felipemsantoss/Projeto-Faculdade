import type { ReactElement } from 'react';
import type { GlyphName } from '../types';

/**
 * Biblioteca de marcas abstratas usadas como face das cartas do desafio.
 * Todas desenhadas na mesma grade de 48×48, com traço aberto e peso uniforme,
 * para que qualquer combinação continue parecendo um único sistema gráfico.
 */
const PATHS: Record<GlyphName, ReactElement> = {
  arc: (
    <>
      <path d="M7 33a17 17 0 0 1 34 0" />
      <path d="M16 33a8 8 0 0 1 16 0" />
      <path d="M7 39h34" />
    </>
  ),
  grid: (
    <>
      {[14, 24, 34].map((y) =>
        [14, 24, 34].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.1" fill="currentColor" stroke="none" />),
      )}
    </>
  ),
  helix: (
    <>
      <path d="M13 9c18 8 4 22 22 30" />
      <path d="M35 9c-18 8-4 22-22 30" />
      <path d="M17 24h14" />
    </>
  ),
  vector: (
    <>
      <path d="M24 8 39 39H9Z" />
      <path d="M24 8v31" />
    </>
  ),
  ring: (
    <>
      <circle cx="24" cy="24" r="14" />
      <circle cx="30" cy="18" r="5" />
    </>
  ),
  shard: (
    <>
      <path d="M24 7 39 21 30 41 14 35 11 17Z" />
      <path d="M24 7 30 41" />
    </>
  ),
  wave: (
    <>
      <path d="M6 24c5-13 10 13 15 0s10 13 15 0" />
      <path d="M6 34c5-8 10 8 15 0s10 8 15 0" opacity="0.45" />
    </>
  ),
  node: (
    <>
      <circle cx="24" cy="24" r="5.5" />
      <path d="M24 18.5V7M28.8 26.8 39 33M19.2 26.8 9 33" />
    </>
  ),
  cross: (
    <>
      <path d="M24 7v10M24 31v10M7 24h10M31 24h10" />
      <rect x="20" y="20" width="8" height="8" transform="rotate(45 24 24)" />
    </>
  ),
  lens: (
    <>
      <circle cx="18" cy="24" r="11" />
      <circle cx="30" cy="24" r="11" />
    </>
  ),
  stack: (
    <>
      <rect x="7" y="10" width="28" height="7.5" rx="3.75" />
      <rect x="10" y="20.5" width="28" height="7.5" rx="3.75" />
      <rect x="13" y="31" width="28" height="7.5" rx="3.75" />
    </>
  ),
  pulse: (
    <>
      <path d="M5 24h11l4-13 6 26 4-13h13" />
    </>
  ),
  orbit: (
    <>
      <ellipse cx="24" cy="24" rx="18" ry="7" transform="rotate(-24 24 24)" />
      <circle cx="24" cy="24" r="4.5" fill="currentColor" stroke="none" />
      <circle cx="38" cy="16" r="2.4" fill="currentColor" stroke="none" />
    </>
  ),
  prism: (
    <>
      <path d="M24 8 39 36H9Z" />
      <path d="M4 26h14" />
      <path d="M28 30h16M29 34h13M27 26h17" opacity="0.6" />
    </>
  ),
};

/** Nomes legíveis — entram no aria-label das cartas reveladas. */
export const GLYPH_LABELS: Record<GlyphName, string> = {
  arc: 'arco',
  grid: 'malha',
  helix: 'hélice',
  vector: 'vetor',
  ring: 'anel',
  shard: 'lasca',
  wave: 'onda',
  node: 'nó',
  cross: 'cruz',
  lens: 'lente',
  stack: 'pilha',
  pulse: 'pulso',
  orbit: 'órbita',
  prism: 'prisma',
};

interface GlyphProps {
  name: GlyphName;
  className?: string;
  strokeWidth?: number;
}

export function Glyph({ name, className, strokeWidth = 1.6 }: GlyphProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
