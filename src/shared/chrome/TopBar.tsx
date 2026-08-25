import { useEffect, useRef, useState } from 'react';
import { useExperience } from '../../state/ExperienceContext';
import { useSession } from '../../state/SessionContext';
import { cx } from '../../lib/format';
import './chrome.css';

export function TopBar() {
  const { phase, exit } = useExperience();
  const { count, open, pulse } = useSession();
  const [bumping, setBumping] = useState(false);
  const firstRender = useRef(true);

  // O ícone só reage a partir do segundo valor de `pulse` — não na montagem.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setBumping(true);
    const id = window.setTimeout(() => setBumping(false), 620);
    return () => window.clearTimeout(id);
  }, [pulse]);

  return (
    <header className="topbar">
      <a
        className="brand"
        href="#catalogo"
        onClick={(event) => {
          event.preventDefault();
          exit();
        }}
      >
        <svg className="brand__mark" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M12 2a10 10 0 0 0 0 20" fill="currentColor" opacity="0.9" />
        </svg>
        <span className="brand__name">
          Atelier<span className="brand__name-thin">Noir</span>
        </span>
      </a>

      <div className="topbar__actions">
        {phase !== 'catalog' && (
          <button type="button" className="ghost-btn" onClick={exit}>
            <svg viewBox="0 0 16 16" aria-hidden="true" className="ghost-btn__icon">
              <path
                d="M10 3 5 8l5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Voltar à loja</span>
          </button>
        )}

        <button
          type="button"
          id="cart-anchor"
          className={cx('cart-btn', bumping && 'is-bumping')}
          onClick={open}
          aria-label={`Abrir carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" className="cart-btn__icon">
            <path
              d="M4.5 6.5h11l-1 9.5h-9l-1-9.5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <path
              d="M7.4 6.5V5a2.6 2.6 0 0 1 5.2 0v1.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          {/* O contador só aparece quando há algo dentro. */}
          {count > 0 && (
            <span className="cart-btn__count" aria-hidden="true">
              {count}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
