import { useCallback, useEffect, useRef, useState } from 'react';
import { useExperience } from '../../state/ExperienceContext';
import { useSession } from '../../state/SessionContext';
import { useReducedMotion } from '../../hooks/useMediaQuery';
import { log, logAlerta } from '../../lib/debug';
import { clamp, lerp } from '../../lib/shuffle';
import { cx, formatPrice, pad2 } from '../../lib/format';
import type { Product } from '../../types';
import { ProductArtwork } from '../../shared/artwork/ProductArtwork';
import './carousel.css';

interface CarouselProps {
  products: Product[];
  onSelect: (product: Product) => void;
}

/** Constantes da "física" — ajustadas no olho até o arraste parecer objeto. */
const SPRING = 0.145;
const DAMPING = 0.76;
/** Quanto da velocidade do flick vira distância percorrida. */
const FLICK_PROJECTION = 7;
/** Deslocamento acima do qual o gesto é arraste, não clique. */
const DRAG_THRESHOLD = 8;
/** Duração da coreografia de saída antes de trocar de fase. */
const CHOREOGRAPHY_MS = 620;

export function Carousel({ products, onSelect }: CarouselProps) {
  const { focus } = useExperience();
  const { isUnlocked } = useSession();
  const reducedMotion = useReducedMotion();

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);

  const [active, setActive] = useState(0);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const choiceTimer = useRef(0);

  const last = products.length - 1;

  const motionState = useRef({
    position: 0,
    target: 0,
    velocity: 0,
    dragging: false,
    /** Ponteiro pousado, ainda indeciso entre toque e arraste. */
    armed: false,
    pointerId: -1,
    startX: 0,
    startPosition: 0,
    travelled: 0,
    spacing: 340,
    frozen: false,
    /** Última posição efetivamente escrita no DOM. */
    painted: Number.NaN,
  });

  /** Espaçamento entre cards deriva da largura real do card renderizado. */
  const measure = useCallback(() => {
    const card = cardRefs.current[0];
    if (!card) return;
    const width = card.getBoundingClientRect().width;
    const narrow = window.matchMedia('(max-width: 720px)').matches;
    motionState.current.spacing = width * (narrow ? 0.78 : 0.72);
  }, []);

  /** Escreve os transforms direto no DOM: nenhum render de React por quadro. */
  const paint = useCallback(() => {
    const { position, spacing } = motionState.current;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      const delta = index - position;
      const distance = Math.abs(delta);
      // Cards muito distantes param de se afastar — evita uma pista infinita.
      const bounded = clamp(delta, -3.2, 3.2);

      const x = bounded * spacing;
      const z = -distance * 190;
      const rotate = -bounded * 21;
      const scale = 1 - Math.min(distance, 3) * 0.085;
      const opacity = distance > 2.7 ? 0 : 1 - Math.min(distance, 2.7) * 0.24;
      const blur = distance <= 1 ? 0 : Math.min(distance - 1, 2) * 2.4;

      card.style.transform = `translate3d(${x}px, 0, ${z}px) rotateY(${rotate}deg) scale(${scale})`;
      card.style.opacity = String(opacity);
      card.style.filter = blur > 0.05 ? `blur(${blur}px)` : '';
      card.style.zIndex = String(200 - Math.round(distance * 10));
      card.style.pointerEvents = distance > 2.7 ? 'none' : '';

      const focused = distance < 0.5 ? 'true' : 'false';
      if (card.dataset.focused !== focused) card.dataset.focused = focused;
    });

    motionState.current.painted = position;
  }, []);

  // Loop principal: mola em direção ao alvo, ou leitura direta do dedo.
  useEffect(() => {
    let frame = 0;

    const tick = () => {
      const state = motionState.current;

      if (!state.frozen) {
        if (state.dragging) {
          state.velocity = 0;
        } else if (reducedMotion) {
          state.position = state.target;
        } else {
          state.velocity += (state.target - state.position) * SPRING;
          state.velocity *= DAMPING;
          state.position += state.velocity;

          // Encaixa e dorme quando o movimento se torna imperceptível.
          if (Math.abs(state.velocity) < 0.0004 && Math.abs(state.target - state.position) < 0.0008) {
            state.position = state.target;
            state.velocity = 0;
          }
        }

        // Em repouso não há nada para reescrever: o loop fica ocioso de graça.
        if (!(Math.abs(state.position - state.painted) < 0.00005)) paint();
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [paint, reducedMotion]);

  // Remede sempre que o layout puder ter mudado.
  useEffect(() => {
    measure();
    paint();
    const observer = new ResizeObserver(() => {
      measure();
      paint();
    });
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [measure, paint]);

  const goTo = useCallback(
    (index: number) => {
      const next = clamp(Math.round(index), 0, last);
      motionState.current.target = next;
      setActive((current) => (current === next ? current : next));
      focus(next);
    },
    [focus, last],
  );

  useEffect(() => {
    focus(0);
  }, [focus]);

  // ---------- Arraste (só no toque) ----------

  /**
   * No desktop quem conduz o carrossel é a rolagem, as setas e o teclado.
   * O arraste fica para telas de toque, onde deslizar é o gesto natural.
   *
   * Detalhe que custou caro: a captura de ponteiro **não** pode ser feita no
   * `pointerdown`. Com a captura ativa, a especificação manda o evento `click`
   * para o elemento que capturou — o container — e o `onClick` do card nunca
   * dispara, então clicar no produto não fazia absolutamente nada. Aqui a
   * captura só acontece quando o dedo realmente começa a arrastar.
   */
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (chosenId || event.button !== 0 || event.pointerType === 'mouse') return;
    const state = motionState.current;
    state.armed = true;
    state.dragging = false;
    state.pointerId = event.pointerId;
    state.startX = event.clientX;
    state.startPosition = state.position;
    state.travelled = 0;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = motionState.current;
    if (!state.armed || event.pointerId !== state.pointerId) return;

    const dx = event.clientX - state.startX;
    state.travelled = Math.max(state.travelled, Math.abs(dx));

    // Enquanto o gesto ainda pode ser um toque, não capturamos nada.
    if (!state.dragging) {
      if (state.travelled <= DRAG_THRESHOLD) return;
      state.dragging = true;
      setIsDragging(true);
      try {
        viewportRef.current?.setPointerCapture(event.pointerId);
      } catch {
        /* ponteiro já encerrado — seguimos sem captura */
      }
    }

    let next = state.startPosition - dx / state.spacing;
    // Resistência elástica nas pontas: dá limite sem travar seco.
    if (next < 0) next *= 0.35;
    else if (next > last) next = last + (next - last) * 0.35;

    state.position = next;
    // Velocidade instantânea alimenta o arremesso na soltura.
    state.velocity = lerp(state.velocity, (state.position - state.startPosition) * 0.06, 0.5);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = motionState.current;
    if (!state.armed || event.pointerId !== state.pointerId) return;

    const arrastou = state.dragging;
    state.armed = false;
    state.dragging = false;
    state.pointerId = -1;
    setIsDragging(false);

    if (!arrastou) return; // foi um toque: deixamos o clique seguir para o card

    try {
      viewportRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      /* nada a liberar */
    }

    const projected = state.position + state.velocity * FLICK_PROJECTION;
    goTo(projected);
  };

  // ---------- Roda / trackpad ----------

  const wheelAccumulator = useRef(0);
  const onWheel = (event: React.WheelEvent) => {
    if (chosenId) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    wheelAccumulator.current += delta;
    if (Math.abs(wheelAccumulator.current) < 42) return;
    goTo(motionState.current.target + Math.sign(wheelAccumulator.current));
    wheelAccumulator.current = 0;
  };

  // ---------- Teclado ----------

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(motionState.current.target + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(motionState.current.target - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      goTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      goTo(last);
    }
  };

  // ---------- Escolha do produto ----------

  /**
   * Coreografia de saída: o card escolhido avança na direção do observador
   * enquanto os vizinhos se afastam em leque. O rAF é congelado para que as
   * transições de CSS assumam sem disputa pelo mesmo `transform`.
   */
  const choose = useCallback(
    (product: Product, index: number) => {
      if (chosenId) return;
      log('catalogo', 'peça escolhida — iniciando coreografia de saída', { id: product.id, indice: index });
      setChosenId(product.id);

      const state = motionState.current;
      state.frozen = true;
      const { spacing } = state;

      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const distance = i - index;
        card.style.transitionDelay = `${Math.min(Math.abs(distance), 3) * 45}ms`;
        card.style.filter = '';

        if (i === index) {
          card.style.transform = 'translate3d(0, 0, 130px) rotateY(0deg) scale(1.05)';
          card.style.opacity = '1';
          card.style.zIndex = '300';
        } else {
          const direction = Math.sign(distance) || 1;
          card.style.transform = `translate3d(${direction * spacing * 3.4}px, 0, -620px) rotateY(${
            direction * -46
          }deg) scale(0.7)`;
          card.style.opacity = '0';
        }
      });

      choiceTimer.current = window.setTimeout(() => {
        log('catalogo', 'coreografia terminou — entregando a peça para a fase de produto', { id: product.id });
        onSelect(product);
      }, reducedMotion ? 60 : CHOREOGRAPHY_MS);
    },
    [chosenId, onSelect, reducedMotion],
  );

  // Se o componente sair de cena antes da coreografia terminar (voltar, Esc),
  // a navegação agendada é cancelada em vez de disparar no vazio.
  useEffect(() => () => window.clearTimeout(choiceTimer.current), []);

  /**
   * Rede de segurança. Depois da coreografia o carrossel deveria ter saído de
   * cena junto com o catálogo. Se ainda estamos montados bem depois disso,
   * algo impediu a troca de fase — então descongelamos em vez de deixar o
   * usuário com um carrossel morto que não responde a mais nenhum clique.
   */
  useEffect(() => {
    if (!chosenId) return;
    const timer = window.setTimeout(() => {
      logAlerta('catalogo', 'a troca de fase não aconteceu — reativando o carrossel', { id: chosenId });
      motionState.current.frozen = false;
      motionState.current.painted = Number.NaN;
      setChosenId(null);
    }, CHOREOGRAPHY_MS + 900);
    return () => window.clearTimeout(timer);
  }, [chosenId]);

  const handleCardClick = (product: Product, index: number) => {
    // Um arraste que terminou sobre o card não deve ser lido como clique.
    // Zeramos aqui para que a distância de um gesto não contamine o próximo.
    const arrastou = motionState.current.travelled > DRAG_THRESHOLD;
    motionState.current.travelled = 0;
    if (arrastou) {
      log('catalogo', 'clique ignorado — o gesto foi um arraste');
      return;
    }
    log('catalogo', 'clique no card', { id: product.id, indice: index, ativo: active });
    if (index !== active) {
      goTo(index);
      return;
    }
    choose(product, index);
  };

  /** Parallax de hover: alimenta as camadas do SVG do produto. */
  const handleCardPointerMove = (event: React.PointerEvent<HTMLElement>, index: number) => {
    if (index !== active || reducedMotion || motionState.current.dragging) return;
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty('--px', px.toFixed(3));
    card.style.setProperty('--py', py.toFixed(3));
  };

  const resetParallax = (event: React.PointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty('--px', '0');
    event.currentTarget.style.setProperty('--py', '0');
  };

  const activeProduct = products[active];

  return (
    <section
      className={cx('carousel', isDragging && 'is-dragging', chosenId && 'is-choosing')}
      aria-roledescription="carrossel"
      aria-label="Catálogo de peças"
    >
      <div
        className="carousel__viewport"
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
      >
        <div className="carousel__track" ref={trackRef}>
          {products.map((product, index) => {
            const unlocked = isUnlocked(product.id);
            const isActive = index === active;

            return (
              <article
                key={product.id}
                className="pcard"
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                style={{ '--accent': product.accent } as React.CSSProperties}
                onPointerMove={(event) => handleCardPointerMove(event, index)}
                onPointerLeave={resetParallax}
                aria-current={isActive ? 'true' : undefined}
              >
                <button
                  type="button"
                  className="pcard__hit"
                  onClick={() => handleCardClick(product, index)}
                  onFocus={() => index !== active && goTo(index)}
                  aria-label={
                    isActive
                      ? `${product.name}, ${product.category}, ${formatPrice(product.price)}. ${
                          unlocked ? 'Já desbloqueado. Abrir produto.' : 'Bloqueado. Iniciar desafio para desbloquear.'
                        }`
                      : `Trazer ${product.name} para o centro`
                  }
                >
                  <span className="pcard__frame">
                    <ProductArtwork product={product} className="pcard__art" />
                    <span className="pcard__veil" aria-hidden="true" />
                    <span className="pcard__sheen" aria-hidden="true" />

                    <span className="pcard__top">
                      <span className="pcard__index">{product.index}</span>
                      <span className={cx('pcard__state', unlocked && 'is-unlocked')}>
                        {unlocked ? (
                          <>
                            <svg viewBox="0 0 12 12" aria-hidden="true">
                              <path d="M2.5 6.4 4.8 8.7 9.5 3.9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Desbloqueado
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 12 12" aria-hidden="true">
                              <rect x="2.5" y="5.2" width="7" height="5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
                              <path d="M4.2 5.2V4a1.8 1.8 0 0 1 3.6 0v1.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
                            </svg>
                            Bloqueado
                          </>
                        )}
                      </span>
                    </span>

                    <span className="pcard__body">
                      <span className="pcard__category">{product.category}</span>
                      <span className="pcard__name">{product.name}</span>
                      <span className="pcard__tagline">{product.tagline}</span>
                      <span className="pcard__row">
                        <span className="pcard__price">{formatPrice(product.price)}</span>
                        <span className="pcard__cta" aria-hidden="true">
                          {unlocked ? 'Abrir' : 'Desbloquear'}
                          <svg viewBox="0 0 14 14">
                            <path d="M3 11 11 3M5 3h6v6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </span>
                    </span>
                  </span>
                </button>
              </article>
            );
          })}
        </div>
      </div>

      <div className="carousel__console">
        <button
          type="button"
          className="carousel__arrow"
          onClick={() => goTo(motionState.current.target - 1)}
          disabled={active === 0 || Boolean(chosenId)}
          aria-label="Peça anterior"
        >
          <svg viewBox="0 0 18 18" aria-hidden="true">
            <path d="M11 3 5 9l6 6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="carousel__readout" aria-hidden="true">
          <span className="carousel__count">{pad2(active + 1)}</span>
          <span className="carousel__rail">
            {products.map((product, index) => (
              <span key={product.id} className={cx('carousel__tick', index === active && 'is-active')} />
            ))}
          </span>
          <span className="carousel__total">{pad2(products.length)}</span>
        </div>

        <button
          type="button"
          className="carousel__arrow"
          onClick={() => goTo(motionState.current.target + 1)}
          disabled={active === last || Boolean(chosenId)}
          aria-label="Próxima peça"
        >
          <svg viewBox="0 0 18 18" aria-hidden="true">
            <path d="M7 3l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <p className="carousel__hint">
        <span aria-hidden="true">Arraste ou role</span>
        <span className="u-sr-only">
          Use as setas do teclado para navegar entre as peças. Pressione Enter na peça central para abri-la.
        </span>
      </p>

      {/* Anúncio da peça em foco para leitores de tela. */}
      <p className="u-sr-only" role="status" aria-live="polite">
        {activeProduct ? `${activeProduct.name}, peça ${active + 1} de ${products.length}.` : ''}
      </p>
    </section>
  );
}
