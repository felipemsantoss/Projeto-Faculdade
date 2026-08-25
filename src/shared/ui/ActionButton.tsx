import { forwardRef, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import { log } from '../../lib/debug';
import { cx } from '../../lib/format';
import './action-button.css';

type Variant = 'solid' | 'outline' | 'quiet';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
  children: ReactNode;
}

/**
 * Botão único do sistema. A cor sólida é sempre o acento do produto atual —
 * o call to action herda a identidade da peça em vez de ter cor própria.
 */
export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(function ActionButton(
  { variant = 'solid', icon, children, className, onClick, ...rest },
  ref,
) {
  /**
   * Todo botão de ação deixa rastro antes de repassar o clique. É o primeiro
   * elo da trilha: se nada aparecer no console, o clique nem chegou ao React.
   */
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    log('ui', 'botão acionado', {
      rotulo: event.currentTarget.textContent?.trim(),
      variante: variant,
      temHandler: typeof onClick === 'function',
    });

    if (!onClick) {
      log('ui', 'botão sem ação ligada — nada acontece depois daqui');
      return;
    }
    onClick(event);
  };

  return (
    <button
      ref={ref}
      type="button"
      className={cx('action', `action--${variant}`, className)}
      data-cursor="link"
      onClick={handleClick}
      {...rest}
    >
      <span className="action__wipe" aria-hidden="true" />
      <span className="action__label">{children}</span>
      {icon && (
        <span className="action__icon" aria-hidden="true">
          {icon}
        </span>
      )}
    </button>
  );
});

export const ArrowIcon = (
  <svg viewBox="0 0 16 16">
    <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LockIcon = (
  <svg viewBox="0 0 16 16">
    <rect x="3.5" y="7" width="9" height="6.5" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5.8 7V5.4a2.2 2.2 0 0 1 4.4 0V7" fill="none" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const BagIcon = (
  <svg viewBox="0 0 16 16">
    <path d="M3.6 5.4h8.8l-.8 7.6H4.4l-.8-7.6Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M5.9 5.4V4.2a2.1 2.1 0 0 1 4.2 0v1.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
