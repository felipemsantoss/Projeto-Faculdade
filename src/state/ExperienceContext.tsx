import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { log } from '../lib/debug';
import { withAlpha } from '../lib/color';
import { useSession } from './SessionContext';
import type { Phase, Product } from '../types';

interface ExperienceApi {
  phase: Phase;
  /** Produto que está conduzindo a jornada (null enquanto se navega o catálogo). */
  product: Product | null;
  /** Índice em destaque no carrossel — governa o tema de fundo. */
  focusedIndex: number;
  accent: string;
  /** Quantas vezes o usuário voltou ao catálogo — 0 na primeira visita. */
  catalogVisits: number;
  focus: (index: number) => void;
  select: (product: Product) => void;
  beginChallenge: () => void;
  /** Envia o resultado do minigame à API; só avança se o servidor aceitar. */
  completeChallenge: (result: { moves: number; seconds: number }) => void;
  exit: () => void;
}

const ExperienceContext = createContext<ExperienceApi | null>(null);

const FALLBACK_ACCENT = '#a78bfa';

/**
 * Estado puramente de interface: em que fase a jornada está e qual peça a
 * conduz. Quem sabe o que está desbloqueado é o servidor, via SessionContext.
 */
export function ExperienceProvider({ children }: { children: ReactNode }) {
  const { products, unlockProduct } = useSession();

  const [phase, setPhase] = useState<Phase>('catalog');
  const [product, setProduct] = useState<Product | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [catalogVisits, setCatalogVisits] = useState(0);

  // O acento segue o produto da jornada; no catálogo, segue o card central.
  const accent = (product ?? products[focusedIndex] ?? products[0])?.accent ?? FALLBACK_ACCENT;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-soft', withAlpha(accent, 0.16));
    root.style.setProperty('--accent-line', withAlpha(accent, 0.42));
  }, [accent]);

  const focus = useCallback((index: number) => setFocusedIndex(index), []);

  const select = useCallback((next: Product) => {
    log('fase', 'catálogo → produto', { id: next.id, nome: next.name });
    setProduct(next);
    setPhase('stage');
  }, []);

  const beginChallenge = useCallback(() => {
    log('fase', 'produto → minigame');
    setPhase('game');
  }, []);

  const completeChallenge = useCallback(
    ({ moves, seconds }: { moves: number; seconds: number }) => {
      if (!product) return;
      log('fase', 'minigame vencido — registrando na API', { id: product.id, moves, seconds });

      void unlockProduct(product.id, moves, seconds).then((ok) => {
        if (!ok) {
          // A API recusou o resultado: o usuário volta ao produto, ainda lacrado.
          log('fase', 'API recusou o desbloqueio — voltando para a peça');
          setPhase('stage');
          return;
        }
        log('fase', 'desbloqueio confirmado pela API → revelação');
        setPhase('unlocked');
      });
    },
    [product, unlockProduct],
  );

  const exit = useCallback(() => {
    log('fase', 'voltando ao catálogo');
    setPhase('catalog');
    setProduct(null);
    setCatalogVisits((value) => value + 1);
  }, []);

  const value = useMemo<ExperienceApi>(
    () => ({
      phase,
      product,
      focusedIndex,
      accent,
      catalogVisits,
      focus,
      select,
      beginChallenge,
      completeChallenge,
      exit,
    }),
    [phase, product, focusedIndex, accent, catalogVisits, focus, select, beginChallenge, completeChallenge, exit],
  );

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

export function useExperience(): ExperienceApi {
  const context = useContext(ExperienceContext);
  if (!context) throw new Error('useExperience precisa estar dentro de <ExperienceProvider>.');
  return context;
}
