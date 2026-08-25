import { cx } from '../../lib/format';

interface CupProps {
  /** Posição que o copo ocupa na mesa (0, 1, 2). */
  posicao: number;
  erguido: boolean;
  /** Quem passa por cima e quem passa por baixo durante um cruzamento. */
  passe?: 'frente' | 'fundo';
  estado?: 'acerto' | 'erro' | 'alvo';
  podeEscolher: boolean;
  accent: string;
  onEscolher: () => void;
}

/**
 * Um copo. A silhueta é desenhada em SVG para acompanhar o mesmo acabamento
 * dos produtos: metal escuro, aresta de luz e o acento da peça na boca.
 */
export function Cup({ posicao, erguido, passe, estado, podeEscolher, accent, onEscolher }: CupProps) {
  const rotulo = `Copo ${posicao + 1}`;

  return (
    <button
      type="button"
      className={cx('copo', erguido && 'is-erguido', estado && `is-${estado}`)}
      style={{ '--pos': posicao } as React.CSSProperties}
      data-passe={passe}
      onClick={onEscolher}
      disabled={!podeEscolher}
      aria-label={podeEscolher ? `Escolher ${rotulo}` : rotulo}
    >
      <span className="copo__sombra" aria-hidden="true" />

      <svg className="copo__corpo" viewBox="0 0 120 140" aria-hidden="true">
        <defs>
          <linearGradient id={`copo-${posicao}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0d0d12" />
            <stop offset="34%" stopColor="#24242f" />
            <stop offset="62%" stopColor="#15151d" />
            <stop offset="100%" stopColor="#0a0a0e" />
          </linearGradient>
        </defs>

        {/* Corpo tronco-cônico, boca embaixo. */}
        <path
          d="M34 10h52l14 118a6 6 0 0 1-6 7H26a6 6 0 0 1-6-7Z"
          fill={`url(#copo-${posicao})`}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="1.2"
        />
        {/* Reflexo vertical. */}
        <path d="M42 14h9l-6 117h-11Z" fill="rgba(255,255,255,0.055)" />
        {/* Tampo. */}
        <ellipse cx="60" cy="10" rx="26" ry="7" fill="#191922" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
        {/* Aro na boca, na cor da peça. */}
        <path
          d="M20 128h80"
          stroke={accent}
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.55"
          className="copo__aro"
        />
      </svg>

      <span className="copo__marca" aria-hidden="true" />
    </button>
  );
}
