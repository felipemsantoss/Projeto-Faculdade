import { useId } from 'react';
import { withAlpha } from '../../lib/color';
import { cx } from '../../lib/format';
import type { Product } from '../../types';
import './artwork.css';

interface ProductArtworkProps {
  product: Product;
  className?: string;
}

/**
 * Cada produto é desenhado, não fotografado: SVG gerado a partir da própria
 * paleta. Isso mantém o catálogo coerente, leve e nítido em qualquer tela.
 * As camadas .art__* existem para o parallax — o card as move em ritmos
 * diferentes durante o hover.
 */
export function ProductArtwork({ product, className }: ProductArtworkProps) {
  const uid = useId().replace(/:/g, '');
  const key = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${key(name)})`;
  const { accent, accentDeep } = product;

  return (
    <svg
      className={cx('art', className)}
      viewBox="0 0 600 760"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${product.name} — ${product.category}`}
    >
      <defs>
        <radialGradient id={key('bg')} cx="50%" cy="30%" r="78%">
          <stop offset="0%" stopColor={accentDeep} />
          <stop offset="55%" stopColor="#0a0a0f" />
          <stop offset="100%" stopColor="#050507" />
        </radialGradient>
        <radialGradient id={key('glow')}>
          <stop offset="0%" stopColor={withAlpha(accent, 0.55)} />
          <stop offset="60%" stopColor={withAlpha(accent, 0.12)} />
          <stop offset="100%" stopColor={withAlpha(accent, 0)} />
        </radialGradient>
        <linearGradient id={key('metal')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#20202a" />
          <stop offset="52%" stopColor="#101017" />
          <stop offset="100%" stopColor="#08080c" />
        </linearGradient>
        <linearGradient id={key('sheen')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <linearGradient id={key('beam')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={withAlpha(accent, 0.34)} />
          <stop offset="100%" stopColor={withAlpha(accent, 0)} />
        </linearGradient>
        <radialGradient id={key('floor')}>
          <stop offset="0%" stopColor={withAlpha(accent, 0.26)} />
          <stop offset="100%" stopColor={withAlpha(accent, 0)} />
        </radialGradient>
      </defs>

      <g className="art__bg">
        <rect width="600" height="760" fill={url('bg')} />
      </g>

      <g className="art__glow">
        <ellipse cx="300" cy="300" rx="240" ry="230" fill={url('glow')} />
      </g>

      <g className="art__object">
        {product.artwork === 'monolith' && (
          <>
            <ellipse cx="300" cy="676" rx="156" ry="30" fill={url('floor')} />
            <rect x="214" y="112" width="172" height="540" rx="86" fill={url('metal')} />
            <rect
              x="214"
              y="112"
              width="172"
              height="540"
              rx="86"
              fill="none"
              stroke="rgba(255,255,255,0.10)"
            />
            <rect x="238" y="132" width="38" height="500" rx="19" fill={url('sheen')} />
            {Array.from({ length: 18 }, (_, i) => (
              <line
                key={i}
                x1="252"
                x2="348"
                y1={214 + i * 19}
                y2={214 + i * 19}
                stroke={withAlpha(accent, 0.16)}
                strokeWidth="1.4"
              />
            ))}
            <ellipse cx="300" cy="112" rx="86" ry="17" fill="#0d0d12" />
            <ellipse
              cx="300"
              cy="112"
              rx="58"
              ry="11"
              fill="none"
              stroke={withAlpha(accent, 0.55)}
              strokeWidth="1.6"
            />
          </>
        )}

        {product.artwork === 'bloom' && (
          <>
            <path d="M300 316 L146 706 L454 706 Z" fill={url('beam')} />
            <g transform="rotate(-27 300 316)">
              <rect
                x="292"
                y="140"
                width="16"
                height="392"
                rx="8"
                fill={url('metal')}
                stroke="rgba(255,255,255,0.09)"
              />
            </g>
            <g transform="rotate(33 300 316)">
              <rect
                x="292"
                y="150"
                width="14"
                height="404"
                rx="7"
                fill={url('metal')}
                stroke="rgba(255,255,255,0.07)"
              />
            </g>
            <circle cx="300" cy="316" r="56" fill={url('glow')} />
            <circle cx="300" cy="316" r="56" fill="none" stroke={withAlpha(accent, 0.62)} strokeWidth="1.6" />
            <circle cx="300" cy="316" r="27" fill="#07070a" stroke="rgba(255,255,255,0.12)" />
            <ellipse cx="300" cy="700" rx="122" ry="22" fill="#0c0c11" stroke="rgba(255,255,255,0.07)" />
          </>
        )}

        {product.artwork === 'solstice' && (
          <>
            <circle cx="300" cy="368" r="192" fill="none" stroke="rgba(255,255,255,0.06)" />
            <circle cx="300" cy="368" r="154" fill="none" stroke="rgba(255,255,255,0.05)" />
            {Array.from({ length: 12 }, (_, i) => (
              <line
                key={i}
                x1="300"
                y1="204"
                x2="300"
                y2="218"
                stroke={withAlpha(accent, 0.4)}
                strokeWidth="1.6"
                strokeLinecap="round"
                transform={`rotate(${i * 30} 300 368)`}
              />
            ))}
            <circle cx="300" cy="368" r="132" fill={url('metal')} stroke="rgba(255,255,255,0.10)" />
            <path
              d="M282 266 A104 104 0 0 1 380 302"
              fill="none"
              stroke={accent}
              strokeWidth="9"
              strokeLinecap="round"
              opacity="0.85"
            />
            <circle cx="300" cy="368" r="64" fill="#0a0a0f" stroke={withAlpha(accent, 0.3)} />
            <circle cx="300" cy="368" r="6" fill={accent} />
            <ellipse cx="300" cy="662" rx="150" ry="26" fill={url('floor')} />
          </>
        )}

        {product.artwork === 'orbit' && (
          <>
            <ellipse
              cx="300"
              cy="368"
              rx="212"
              ry="92"
              fill="none"
              stroke={withAlpha(accent, 0.2)}
              transform="rotate(-18 300 368)"
            />
            <path
              d="M168 392 A132 132 0 0 1 432 392"
              fill="none"
              stroke={url('metal')}
              strokeWidth="26"
              strokeLinecap="round"
            />
            <path
              d="M168 392 A132 132 0 0 1 432 392"
              fill="none"
              stroke="rgba(255,255,255,0.14)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {[130, 396].map((x) => (
              <g key={x}>
                <rect
                  x={x}
                  y="376"
                  width="74"
                  height="132"
                  rx="37"
                  fill={url('metal')}
                  stroke="rgba(255,255,255,0.10)"
                />
                <ellipse cx={x + 37} cy="442" rx="23" ry="42" fill={withAlpha(accent, 0.22)} />
                <ellipse cx={x + 37} cy="442" rx="23" ry="42" fill="none" stroke={withAlpha(accent, 0.5)} />
              </g>
            ))}
            <ellipse cx="300" cy="668" rx="150" ry="26" fill={url('floor')} />
          </>
        )}

        {product.artwork === 'aperture' && (
          <>
            <circle cx="300" cy="368" r="198" fill="none" stroke="rgba(255,255,255,0.06)" />
            <circle cx="300" cy="368" r="172" fill={url('metal')} stroke="rgba(255,255,255,0.09)" />
            {Array.from({ length: 44 }, (_, i) => (
              <line
                key={i}
                x1="300"
                y1="176"
                x2="300"
                y2="190"
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="1.2"
                transform={`rotate(${i * (360 / 44)} 300 368)`}
              />
            ))}
            {Array.from({ length: 6 }, (_, i) => (
              <path
                key={i}
                d="M300 198 A170 170 0 0 1 447 283 L354 337 A62 62 0 0 0 300 306 Z"
                fill={withAlpha(accent, 0.1 + i * 0.045)}
                stroke={withAlpha(accent, 0.28)}
                strokeWidth="1.2"
                transform={`rotate(${i * 60} 300 368)`}
              />
            ))}
            <circle cx="300" cy="368" r="58" fill="#040406" stroke={withAlpha(accent, 0.55)} />
            <path
              d="M268 344 A44 44 0 0 1 300 328"
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <ellipse cx="300" cy="676" rx="150" ry="24" fill={url('floor')} />
          </>
        )}

        {product.artwork === 'halo' && (
          <>
            <circle cx="300" cy="322" r="152" fill="none" stroke={url('metal')} strokeWidth="36" />
            <circle cx="300" cy="322" r="152" fill="none" stroke={withAlpha(accent, 0.42)} strokeWidth="1.6" />
            <circle cx="300" cy="322" r="134" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="5" />
            <path
              d="M186 226 A152 152 0 0 1 300 170"
              fill="none"
              stroke="rgba(255,255,255,0.24)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {[0, 1, 2, 3, 4].map((i) => (
              <ellipse
                key={i}
                cx="300"
                cy={498 + i * 46}
                rx={124 + i * 32}
                ry={18 + i * 4}
                fill={withAlpha(accent, 0.11 - i * 0.02)}
              />
            ))}
            <ellipse cx="300" cy="702" rx="172" ry="26" fill="#0b0b10" />
          </>
        )}
      </g>
    </svg>
  );
}
