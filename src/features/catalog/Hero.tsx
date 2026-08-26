import { useEffect, useRef } from 'react';
import { useExperience } from '../../state/ExperienceContext';
import './hero.css';

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
      <h1 className="hero__title" ref={titleRef} tabIndex={-1}>
        Compre aqui
      </h1>

      <p className="hero__note">
        Escolha um produto, siga a bolinha entre os copos e libere a compra.
      </p>
    </header>
  );
}
