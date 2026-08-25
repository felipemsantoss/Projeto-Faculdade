import { log } from '../../lib/debug';

/** Id do botão do carrinho na barra superior — destino da animação. */
export const CART_ANCHOR_ID = 'cart-anchor';

const FLIGHT_MS = 820;

/**
 * Teto absoluto de espera. A linha do tempo de animação do navegador só avança
 * enquanto a página desenha quadros: em aba de fundo, ou sob throttling,
 * `animation.finished` simplesmente nunca resolve. Como quem chama isto usa a
 * promessa para efetivar a compra, ela precisa terminar sempre.
 */
const SAFETY_MS = 1100;

/** Por que o voo terminou. Aparece no log para tornar o caminho rastreável. */
export type FlightOutcome =
  | 'animacao-concluida'
  | 'tempo-limite'
  | 'sem-suporte-a-animacao'
  | 'movimento-reduzido'
  | 'origem-invalida'
  | 'destino-ausente';

/**
 * Duplica o elemento de origem e leva a cópia até o ícone do carrinho por um
 * arco. É puramente decorativo: em qualquer desfecho a promessa resolve, e o
 * valor resolvido diz qual caminho foi tomado.
 */
export function flyToCart(origin: HTMLElement | null): Promise<FlightOutcome> {
  const target = document.getElementById(CART_ANCHOR_ID);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const bail = (outcome: FlightOutcome) => {
    log('animacao', `voo até o carrinho dispensado (${outcome})`);
    return Promise.resolve(outcome);
  };

  if (!origin) return bail('origem-invalida');
  if (!target) return bail('destino-ausente');
  if (reduced) return bail('movimento-reduzido');
  if (typeof origin.animate !== 'function') return bail('sem-suporte-a-animacao');

  const from = origin.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (from.width === 0 || from.height === 0) return bail('origem-invalida');

  const ghost = origin.cloneNode(true) as HTMLElement;
  ghost.setAttribute('aria-hidden', 'true');
  ghost.dataset.ghost = 'fly-to-cart';
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: '0',
    zIndex: '90',
    pointerEvents: 'none',
    borderRadius: '22px',
    overflow: 'hidden',
    transformOrigin: 'center',
    willChange: 'transform, opacity',
  } satisfies Partial<CSSStyleDeclaration>);

  document.body.appendChild(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const endScale = Math.max(to.width / from.width, 0.05);

  log('animacao', 'voo até o carrinho iniciado', {
    de: { x: Math.round(from.left), y: Math.round(from.top) },
    para: { x: Math.round(to.left), y: Math.round(to.top) },
    duracaoMs: FLIGHT_MS,
    tetoMs: SAFETY_MS,
  });

  let animation: Animation;
  try {
    animation = ghost.animate(
      [
        { transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)', opacity: 1 },
        {
          transform: `translate3d(${dx * 0.42}px, ${dy * 0.3 - 96}px, 0) scale(0.5) rotate(-7deg)`,
          opacity: 0.96,
          offset: 0.55,
        },
        {
          transform: `translate3d(${dx}px, ${dy}px, 0) scale(${endScale}) rotate(6deg)`,
          opacity: 0,
        },
      ],
      { duration: FLIGHT_MS, easing: 'cubic-bezier(0.5, 0, 0.18, 1)', fill: 'forwards' },
    );
  } catch {
    ghost.remove();
    return bail('sem-suporte-a-animacao');
  }

  // Resolve no que vier primeiro: o fim da animação ou o teto de segurança.
  // Em qualquer um dos caminhos a cópia sai da tela e a promessa termina.
  return new Promise<FlightOutcome>((resolve) => {
    let settled = false;

    const settle = (outcome: FlightOutcome) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try {
        animation.cancel();
      } catch {
        /* já encerrada */
      }
      ghost.remove();
      log('animacao', `voo concluído (${outcome})`);
      resolve(outcome);
    };

    const timer = window.setTimeout(() => settle('tempo-limite'), SAFETY_MS);
    animation.finished.then(
      () => settle('animacao-concluida'),
      () => settle('tempo-limite'),
    );
  });
}
