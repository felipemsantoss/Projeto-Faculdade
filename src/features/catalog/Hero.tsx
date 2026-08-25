import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useExperience } from '../../state/ExperienceContext';
import './hero.css';

const EASE = [0.16, 1, 0.3, 1] as const;

const rise = {
  hidden: { opacity: 0, y: 22, filter: 'blur(8px)' },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.9, delay, ease: EASE },
  }),
};

export function Hero() {
  const { catalogVisits } = useExperience();
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Na primeira visita o foco fica onde o navegador colocou. Ao voltar do
  // produto ou do desafio, devolvemos o foco ao título para quem navega por
  // teclado não ser jogado de volta ao topo do documento.
  useEffect(() => {
    if (catalogVisits > 0) titleRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <header className="hero">
      <motion.p className="hero__eyebrow" variants={rise} initial="hidden" animate="show" custom={0.05}>
        <span className="hero__eyebrow-dot" aria-hidden="true" />
        Coleção 01 — Seis objetos, seis edições
      </motion.p>

      <h1 className="hero__title" ref={titleRef} tabIndex={-1}>
        <motion.span className="hero__line" variants={rise} initial="hidden" animate="show" custom={0.14}>
          Escolha sua
        </motion.span>
        <motion.span className="hero__line" variants={rise} initial="hidden" animate="show" custom={0.24}>
          próxima <em>experiência</em>
        </motion.span>
      </h1>

      <motion.p className="hero__note" variants={rise} initial="hidden" animate="show" custom={0.36}>
        Nenhuma peça é vendida direto. Cada uma está lacrada por um desafio de memória —
        <span className="hero__note-strong"> vença os oito pares e a compra se abre.</span>
      </motion.p>
    </header>
  );
}
