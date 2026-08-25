import { memo } from 'react';
import { GLYPH_LABELS, Glyph } from '../../data/glyphs';
import { cx } from '../../lib/format';
import type { MemoryCard } from '../../types';

interface MemoryCardTileProps {
  card: MemoryCard;
  index: number;
  /** Verdadeiro enquanto o tabuleiro está resolvendo um erro. */
  boardLocked: boolean;
  onFlip: (id: string) => void;
  registerRef: (id: string, node: HTMLButtonElement | null) => void;
}

function labelFor(card: MemoryCard, position: number) {
  if (card.state === 'matched') return `Carta ${position}, par encontrado: ${GLYPH_LABELS[card.glyph]}`;
  if (card.state === 'revealed') return `Carta ${position}, símbolo ${GLYPH_LABELS[card.glyph]}`;
  return `Carta ${position}, virada para baixo. Ativar para revelar`;
}

/**
 * Carta física: dois lados reais girando em torno do eixo Y. O verso nunca é
 * escondido com display, e sim virado — é o que dá peso ao gesto.
 */
export const MemoryCardTile = memo(function MemoryCardTile({
  card,
  index,
  boardLocked,
  onFlip,
  registerRef,
}: MemoryCardTileProps) {
  const isOpen = card.state !== 'hidden';
  const isMatched = card.state === 'matched';
  const disabled = isMatched || (boardLocked && card.state === 'revealed');

  return (
    <button
      type="button"
      ref={(node) => registerRef(card.id, node)}
      className={cx('mcard', isOpen && 'is-open', isMatched && 'is-matched')}
      style={{ '--i': index } as React.CSSProperties}
      onClick={() => onFlip(card.id)}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      aria-pressed={isOpen}
      aria-label={labelFor(card, index + 1)}
    >
      <span className="mcard__inner">
        <span className="mcard__face mcard__face--back">
          <span className="mcard__weave" aria-hidden="true" />
          <span className="mcard__seal" aria-hidden="true" />
        </span>
        <span className="mcard__face mcard__face--front">
          <Glyph name={card.glyph} className="mcard__glyph" />
          <span className="mcard__halo" aria-hidden="true" />
        </span>
      </span>
      <span className="mcard__flash" aria-hidden="true" />
    </button>
  );
});
