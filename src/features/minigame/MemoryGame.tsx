import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useExperience } from '../../state/ExperienceContext';
import { useMemoryGame } from './useMemoryGame';
import { useReducedMotion } from '../../hooks/useMediaQuery';
import { log } from '../../lib/debug';
import { cx } from '../../lib/format';
import type { Product } from '../../types';
import { ActionButton } from '../../shared/ui/ActionButton';
import { useToast } from '../../shared/ui/Toast';
import { GameHud } from './GameHud';
import { MemoryCardTile } from './MemoryCardTile';
import './game.css';

const EASE = [0.16, 1, 0.3, 1] as const;
/** Tempo da coreografia final antes de revelar o produto. */
const CLEAR_MS = 1450;

interface MemoryGameProps {
  product: Product;
  /** Recebe o resultado para a API validar o desbloqueio. */
  onComplete: (result: { moves: number; seconds: number }) => void;
}

interface Beam {
  token: number;
  width: number;
  height: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function MemoryGame({ product, onComplete }: MemoryGameProps) {
  const game = useMemoryGame(product.glyphs);
  const { exit } = useExperience();
  const { push } = useToast();
  const reducedMotion = useReducedMotion();

  const boardRef = useRef<HTMLUListElement>(null);
  const nodes = useRef(new Map<string, HTMLButtonElement>());
  const [beam, setBeam] = useState<Beam | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const registerRef = useCallback((id: string, node: HTMLButtonElement | null) => {
    if (node) nodes.current.set(id, node);
    else nodes.current.delete(id);
  }, []);

  const matchToken = game.lastMatch?.token ?? 0;
  const missToken = game.lastMiss?.token ?? 0;

  // Traça o fio de energia entre as duas cartas que acabaram de combinar.
  useEffect(() => {
    const match = game.lastMatch;
    const board = boardRef.current;
    if (!match || !board) return;

    const [firstId, secondId] = match.ids;
    const first = nodes.current.get(firstId);
    const second = nodes.current.get(secondId);
    if (!first || !second) return;

    log('jogo', 'PAR ENCONTRADO', { cartas: match.ids, total: game.matches + '/' + game.totalPairs });

    const boardRect = board.getBoundingClientRect();
    const a = first.getBoundingClientRect();
    const b = second.getBoundingClientRect();

    setBeam({
      token: match.token,
      width: boardRect.width,
      height: boardRect.height,
      x1: a.left + a.width / 2 - boardRect.left,
      y1: a.top + a.height / 2 - boardRect.top,
      x2: b.left + b.width / 2 - boardRect.left,
      y2: b.top + b.height / 2 - boardRect.top,
    });

    const timer = window.setTimeout(() => setBeam(null), 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchToken]);

  // Erro: um aviso curto, sem interromper o jogo.
  useEffect(() => {
    if (!game.lastMiss) return;
    log('jogo', 'par errado — as cartas voltam em instantes', { cartas: game.lastMiss.ids });
    push('Quase. Tente outra combinação.', 'warn');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missToken]);

  // Vitória: o tabuleiro se recolhe antes de entregar o produto.
  useEffect(() => {
    if (!game.isComplete) return;
    log('jogo', 'MINIGAME CONCLUÍDO — liberando a peça', {
      jogadas: game.moves,
      segundos: game.seconds,
    });
    setIsClearing(true);
    const timer = window.setTimeout(
      () => onComplete({ moves: game.moves, seconds: game.seconds }),
      reducedMotion ? 250 : CLEAR_MS,
    );
    return () => window.clearTimeout(timer);
  }, [game.isComplete, game.moves, game.seconds, onComplete, reducedMotion]);

  return (
    <section className="game" aria-labelledby="game-title">
      <motion.header
        className="game__head"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <p className="game__eyebrow">
          <span className="game__eyebrow-dot" aria-hidden="true" />
          Desafio de memória — {product.name}
        </p>
        <h2 className="game__title" id="game-title">
          Encontre os oito pares
        </h2>
        <p className="game__sub">
          Vire duas cartas por vez. Os pares certos permanecem abertos; os errados voltam.
          Complete o tabuleiro e a compra de <strong>{product.name}</strong> é liberada.
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
        className="game__hud-wrap"
      >
        <GameHud matches={game.matches} totalPairs={game.totalPairs} moves={game.moves} seconds={game.seconds} />
      </motion.div>

      <motion.div
        className="game__board-wrap"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.16, ease: EASE }}
      >
        <ul className={cx('game__board', isClearing && 'is-clearing')} ref={boardRef}>
          {game.cards.map((card, index) => (
            <li key={card.id} className="game__slot">
              <MemoryCardTile
                card={card}
                index={index}
                boardLocked={game.isLocked}
                onFlip={game.flip}
                registerRef={registerRef}
              />
            </li>
          ))}
        </ul>

        {beam && !reducedMotion && (
          <svg
            key={beam.token}
            className="beam"
            viewBox={`0 0 ${beam.width} ${beam.height}`}
            width={beam.width}
            height={beam.height}
            aria-hidden="true"
          >
            <line
              className="beam__line"
              x1={beam.x1}
              y1={beam.y1}
              x2={beam.x2}
              y2={beam.y2}
              pathLength={1}
            />
            <circle className="beam__node" cx={beam.x1} cy={beam.y1} r="5" />
            <circle className="beam__node beam__node--late" cx={beam.x2} cy={beam.y2} r="5" />
          </svg>
        )}
      </motion.div>

      <motion.footer
        className="game__foot"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <ActionButton variant="quiet" onClick={game.restart} disabled={isClearing}>
          Reembaralhar
        </ActionButton>
        <span className="game__sep" aria-hidden="true" />
        <ActionButton variant="quiet" onClick={exit} disabled={isClearing}>
          Voltar ao catálogo
        </ActionButton>
      </motion.footer>
    </section>
  );
}
