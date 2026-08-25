import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useExperience } from '../../state/ExperienceContext';
import { useSession } from '../../state/SessionContext';
import { formatPrice } from '../../lib/format';
import type { Product } from '../../types';
import { ProductArtwork } from '../../shared/artwork/ProductArtwork';
import { ActionButton, ArrowIcon, BagIcon, LockIcon } from '../../shared/ui/ActionButton';
import './stage.css';

const EASE = [0.16, 1, 0.3, 1] as const;

interface ProductStageProps {
  product: Product;
  onAddToCart: (origin: HTMLElement) => void;
}

const line = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay, ease: EASE } }),
};

/**
 * Fase intermediária entre catálogo e desafio. É aqui que a proposta fica
 * explícita: o preço aparece, mas a compra continua fechada.
 */
export function ProductStage({ product, onAddToCart }: ProductStageProps) {
  const { beginChallenge, exit } = useExperience();
  const { isUnlocked } = useSession();
  const unlocked = isUnlocked(product.id);
  const artRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Foco vai para o título ao entrar na fase: o leitor de tela acompanha a troca.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="stage" aria-labelledby="stage-title">
      <motion.div
        className="stage__art"
        ref={artRef}
        initial={{ opacity: 0, scale: 1.09, filter: 'blur(16px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 1.05, ease: EASE }}
      >
        <div className="stage__art-frame">
          <ProductArtwork product={product} />
          <span className="stage__art-veil" aria-hidden="true" />
        </div>
        <span className="stage__watermark" aria-hidden="true">
          {product.index}
        </span>
      </motion.div>

      <div className="stage__panel">
        <motion.p className="stage__eyebrow" variants={line} initial="hidden" animate="show" custom={0.16}>
          <span>{product.index}</span>
          <span className="stage__rule" aria-hidden="true" />
          <span>{product.category}</span>
        </motion.p>

        <motion.h2
          className="stage__title"
          id="stage-title"
          ref={headingRef}
          tabIndex={-1}
          variants={line}
          initial="hidden"
          animate="show"
          custom={0.24}
        >
          {product.name}
        </motion.h2>

        <motion.p className="stage__tagline" variants={line} initial="hidden" animate="show" custom={0.32}>
          {product.tagline}
        </motion.p>

        <motion.p className="stage__description" variants={line} initial="hidden" animate="show" custom={0.4}>
          {product.description}
        </motion.p>

        <motion.dl className="stage__specs" variants={line} initial="hidden" animate="show" custom={0.48}>
          <div>
            <dt>Material</dt>
            <dd>{product.material}</dd>
          </div>
          <div>
            <dt>Tiragem</dt>
            <dd>{product.edition}</dd>
          </div>
          <div>
            <dt>Preço</dt>
            <dd className="stage__price">{formatPrice(product.price)}</dd>
          </div>
        </motion.dl>

        <motion.div className="stage__actions" variants={line} initial="hidden" animate="show" custom={0.56}>
          {unlocked ? (
            <>
              <ActionButton
                icon={BagIcon}
                data-cursor-label="Adicionar"
                onClick={() => artRef.current && onAddToCart(artRef.current)}
              >
                Adicionar ao carrinho
              </ActionButton>
              <ActionButton variant="outline" onClick={beginChallenge} data-cursor-label="Repetir">
                Jogar de novo
              </ActionButton>
            </>
          ) : (
            <>
              <ActionButton icon={ArrowIcon} onClick={beginChallenge} data-cursor-label="Começar">
                Desbloquear para continuar
              </ActionButton>
              <ActionButton variant="outline" onClick={exit} data-cursor-label="Voltar">
                Ver outras peças
              </ActionButton>
            </>
          )}
        </motion.div>

        <motion.p className="stage__brief" variants={line} initial="hidden" animate="show" custom={0.64}>
          {unlocked ? (
            <>
              <span className="stage__brief-icon stage__brief-icon--open" aria-hidden="true">
                {LockIcon}
              </span>
              Peça liberada. A compra está aberta para você.
            </>
          ) : (
            <>
              <span className="stage__brief-icon" aria-hidden="true">
                {LockIcon}
              </span>
              Oito pares para encontrar. Leva cerca de um minuto — e libera a compra em definitivo.
            </>
          )}
        </motion.p>
      </div>
    </section>
  );
}
