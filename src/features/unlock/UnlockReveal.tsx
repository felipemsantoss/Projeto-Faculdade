import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useExperience } from '../../state/ExperienceContext';
import { formatPrice } from '../../lib/format';
import type { Product } from '../../types';
import { ProductArtwork } from '../../shared/artwork/ProductArtwork';
import { ActionButton, ArrowIcon, BagIcon } from '../../shared/ui/ActionButton';
import './unlock.css';

const EASE = [0.16, 1, 0.3, 1] as const;

interface UnlockRevealProps {
  product: Product;
  onAddToCart: (origin: HTMLElement) => void;
}

/**
 * Recompensa. O produto reaparece girando de volta para a frente, os anéis se
 * abrem uma única vez e só então o botão de compra entra em cena.
 */
export function UnlockReveal({ product, onAddToCart }: UnlockRevealProps) {
  const { exit } = useExperience();
  const artRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const handleAdd = () => {
    if (!artRef.current) return;
    setAdded(true);
    onAddToCart(artRef.current);
  };

  return (
    <section className="unlock" aria-labelledby="unlock-title">
      <div className="unlock__rings" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="unlock__ring" style={{ animationDelay: `${i * 140}ms` }} />
        ))}
      </div>

      <motion.p
        className="unlock__eyebrow"
        initial={{ opacity: 0, letterSpacing: '0.6em' }}
        animate={{ opacity: 1, letterSpacing: '0.22em' }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        Produto desbloqueado
      </motion.p>

      <motion.div
        className="unlock__art"
        ref={artRef}
        initial={{ opacity: 0, scale: 0.82, rotateY: -38 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        transition={{ duration: 1.15, delay: 0.1, ease: EASE }}
      >
        <ProductArtwork product={product} />
        <span className="unlock__art-veil" aria-hidden="true" />
      </motion.div>

      <motion.h2
        className="unlock__title"
        id="unlock-title"
        ref={headingRef}
        tabIndex={-1}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, delay: 0.42, ease: EASE }}
      >
        {product.name}
      </motion.h2>

      <motion.p
        className="unlock__note"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
      >
        Você venceu o desafio. A peça fica liberada — inclusive nas próximas visitas.
      </motion.p>

      <motion.div
        className="unlock__actions"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.6, ease: EASE }}
      >
        <div className="unlock__price">
          <span className="unlock__price-label">Preço</span>
          <span className="unlock__price-value">{formatPrice(product.price)}</span>
        </div>

        <ActionButton icon={BagIcon} onClick={handleAdd} data-cursor-label="Adicionar">
          {added ? 'Adicionar outro' : 'Adicionar ao carrinho'}
        </ActionButton>

        <ActionButton variant="outline" icon={ArrowIcon} onClick={exit} data-cursor-label="Catálogo">
          Escolher outra peça
        </ActionButton>
      </motion.div>
    </section>
  );
}
