import { AnimatePresence, motion } from 'framer-motion';
import { formatClock, pad2 } from '../../lib/format';

interface GameHudProps {
  matches: number;
  totalPairs: number;
  moves: number;
  seconds: number;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/** Número que troca com um pequeno deslize vertical, em vez de piscar. */
function RollingValue({ value }: { value: string }) {
  return (
    <span className="hud__value">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '0.7em', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-0.7em', opacity: 0 }}
          transition={{ duration: 0.34, ease: EASE }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function GameHud({ matches, totalPairs, moves, seconds }: GameHudProps) {
  const progress = totalPairs === 0 ? 0 : matches / totalPairs;

  return (
    <div className="hud">
      <div className="hud__stat hud__stat--primary">
        <span className="hud__label">Pares</span>
        <span className="hud__pair">
          <RollingValue value={pad2(matches)} />
          <span className="hud__slash">/</span>
          <span className="hud__total">{pad2(totalPairs)}</span>
        </span>
        <span className="hud__track" aria-hidden="true">
          <span className="hud__fill" style={{ transform: `scaleX(${progress})` }} />
        </span>
      </div>

      <div className="hud__stat">
        <span className="hud__label">Jogadas</span>
        <RollingValue value={pad2(moves)} />
      </div>

      <div className="hud__stat">
        <span className="hud__label">Tempo</span>
        <RollingValue value={formatClock(seconds)} />
      </div>

      {/* Progresso narrado sem repetir a cada segundo do cronômetro. */}
      <p className="u-sr-only" role="status" aria-live="polite">
        {matches} de {totalPairs} pares encontrados em {moves} jogadas.
      </p>
    </div>
  );
}
