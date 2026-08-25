import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useSession } from '../../state/SessionContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { log } from '../../lib/debug';
import { formatPrice, pad2 } from '../../lib/format';
import { ProductArtwork } from '../../shared/artwork/ProductArtwork';
import { ActionButton, ArrowIcon } from '../../shared/ui/ActionButton';
import './cart.css';

const EASE = [0.16, 1, 0.3, 1] as const;

type Checkout = 'idle' | 'processing' | 'done';

export function CartDrawer() {
  const { lines, count, subtotal, isOpen, close, setQuantity, removeFromCart, checkout: enviarPedido, busy } =
    useSession();
  const panelRef = useRef<HTMLDivElement>(null);
  const [checkout, setCheckout] = useState<Checkout>('idle');
  const [orderId, setOrderId] = useState<string | null>(null);

  useLockBodyScroll(isOpen);
  useFocusTrap(panelRef, isOpen, close);

  // O resumo é lido por referência para não entrar nas dependências abaixo:
  // se `count` disparasse o efeito, fechar o pedido (que zera o carrinho)
  // reiniciaria o estado e apagaria a tela de confirmação.
  const resumo = useRef({ count, subtotal });
  resumo.current = { count, subtotal };

  // Só a troca de aberta/fechada reinicia o estado.
  useEffect(() => {
    log('carrinho', isOpen ? 'gaveta aberta' : 'gaveta fechada', resumo.current);
    if (isOpen) {
      setCheckout('idle');
      setOrderId(null);
    }
  }, [isOpen]);

  /** Fecha o pedido na API. O carrinho é esvaziado pelo servidor. */
  const handleCheckout = async () => {
    log('carrinho', 'checkout iniciado', { itens: count, total: subtotal });
    setCheckout('processing');

    const order = await enviarPedido();
    if (!order) {
      // O erro já virou aviso na tela; a sacola continua intacta.
      log('carrinho', 'checkout não concluído — sacola preservada');
      setCheckout('idle');
      return;
    }

    log('carrinho', 'pedido confirmado pela API', { pedido: order.id, total: order.total });
    setOrderId(order.id);
    setCheckout('done');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="cart" role="dialog" aria-modal="true" aria-label="Carrinho">
          <motion.div
            className="cart__scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32 }}
            onClick={close}
          />

          <motion.div
            className="cart__panel"
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 38, mass: 0.9 }}
          >
            <header className="cart__head">
              <div>
                <p className="cart__eyebrow">Sacola</p>
                <h2 className="cart__title">
                  {count === 0 ? 'Vazia' : `${pad2(count)} ${count === 1 ? 'peça' : 'peças'}`}
                </h2>
              </div>
              <button type="button" className="cart__close" onClick={close} aria-label="Fechar carrinho" data-cursor="link" data-cursor-label="Fechar">
                <svg viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M4.5 4.5 13.5 13.5M13.5 4.5 4.5 13.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className="cart__body">
              {checkout === 'done' ? (
                <motion.div
                  className="cart__done"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  <span className="cart__done-mark" aria-hidden="true">
                    <svg viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.35" />
                      <path d="M10 16.5 14.2 20.7 22.5 12.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h3 className="cart__done-title">Pedido confirmado</h3>
                  {orderId && <p className="cart__done-code">{orderId}</p>}
                  <p className="cart__done-note">
                    Enviamos os detalhes por e-mail. Suas peças desbloqueadas continuam liberadas no catálogo.
                  </p>
                  <ActionButton variant="outline" onClick={close} data-cursor-label="Voltar">
                    Continuar explorando
                  </ActionButton>
                </motion.div>
              ) : lines.length === 0 ? (
                <div className="cart__empty">
                  <span className="cart__empty-mark" aria-hidden="true" />
                  <p className="cart__empty-title">Nada por aqui ainda</p>
                  <p className="cart__empty-note">
                    Escolha uma peça no catálogo e vença o desafio de memória para liberá-la.
                  </p>
                  <ActionButton variant="outline" onClick={close} data-cursor-label="Explorar">
                    Ver o catálogo
                  </ActionButton>
                </div>
              ) : (
                <ul className="cart__list">
                  <AnimatePresence initial={false}>
                    {lines.map(({ product, quantity }) => (
                      <motion.li
                        key={product.id}
                        className="cart__line"
                        style={{ '--accent': product.accent } as React.CSSProperties}
                        layout
                        initial={{ opacity: 0, x: 28 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 40, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.42, ease: EASE }}
                      >
                        <span className="cart__thumb">
                          <ProductArtwork product={product} />
                        </span>

                        <div className="cart__info">
                          <p className="cart__line-cat">{product.category}</p>
                          <p className="cart__line-name">{product.name}</p>
                          <p className="cart__line-price">{formatPrice(product.price)}</p>
                        </div>

                        <div className="cart__controls">
                          <div className="cart__stepper">
                            <button
                              type="button"
                              onClick={() => void setQuantity(product.id, quantity - 1)}
                              aria-label={`Diminuir quantidade de ${product.name}`}
                              data-cursor="link"
                            >
                              <svg viewBox="0 0 12 12" aria-hidden="true">
                                <path d="M3 6h6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                              </svg>
                            </button>
                            <span aria-live="polite" aria-label={`Quantidade: ${quantity}`}>{pad2(quantity)}</span>
                            <button
                              type="button"
                              onClick={() => void setQuantity(product.id, quantity + 1)}
                              aria-label={`Aumentar quantidade de ${product.name}`}
                              data-cursor="link"
                            >
                              <svg viewBox="0 0 12 12" aria-hidden="true">
                                <path d="M6 3v6M3 6h6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>

                          <button
                            type="button"
                            className="cart__remove"
                            onClick={() => void removeFromCart(product.id)}
                            data-cursor="link"
                            data-cursor-label="Remover"
                          >
                            Remover
                          </button>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {checkout !== 'done' && lines.length > 0 && (
              <footer className="cart__foot">
                <dl className="cart__summary">
                  <div>
                    <dt>Subtotal</dt>
                    <dd>{formatPrice(subtotal)}</dd>
                  </div>
                  <div className="cart__summary-muted">
                    <dt>Entrega</dt>
                    <dd>Incluída</dd>
                  </div>
                  <div className="cart__summary-total">
                    <dt>Total</dt>
                    <dd>{formatPrice(subtotal)}</dd>
                  </div>
                </dl>

                <ActionButton
                  icon={ArrowIcon}
                  onClick={() => void handleCheckout()}
                  disabled={checkout === 'processing' || busy}
                  className="cart__checkout"
                  data-cursor-label="Finalizar"
                >
                  {checkout === 'processing' ? 'Processando…' : 'Finalizar compra'}
                </ActionButton>

                <p className="cart__fineprint">Pagamento simulado — este é um protótipo de experiência.</p>
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
