import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { log } from '../../lib/debug';
import { shuffle } from '../../lib/shuffle';
import type { GlyphName, MemoryCard } from '../../types';

/** Quanto tempo o par errado fica aberto antes de voltar. */
const MISS_HOLD_MS = 820;

export interface MatchEvent {
  ids: [string, string];
  /** Muda a cada acerto — serve de gatilho para as animações. */
  token: number;
}

export interface MissEvent {
  ids: [string, string];
  token: number;
}

interface State {
  cards: MemoryCard[];
  /** Cartas viradas ainda não resolvidas (0, 1 ou 2). */
  selected: string[];
  moves: number;
  matches: number;
  /** Bloqueia cliques enquanto um erro está sendo exibido. */
  locked: boolean;
  started: boolean;
  lastMatch: MatchEvent | null;
  lastMiss: MissEvent | null;
  token: number;
}

type Action = { type: 'flip'; id: string } | { type: 'resolveMiss' } | { type: 'restart'; glyphs: GlyphName[] };

function buildDeck(glyphs: GlyphName[]): MemoryCard[] {
  const deck = glyphs.flatMap((glyph, pairId) =>
    (['a', 'b'] as const).map<MemoryCard>((side) => ({
      id: `${pairId}-${side}`,
      pairId,
      glyph,
      state: 'hidden',
    })),
  );
  return shuffle(deck);
}

function init(glyphs: GlyphName[]): State {
  return {
    cards: buildDeck(glyphs),
    selected: [],
    moves: 0,
    matches: 0,
    locked: false,
    started: false,
    lastMatch: null,
    lastMiss: null,
    token: 0,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'restart':
      return init(action.glyphs);

    case 'resolveMiss': {
      if (!state.locked) return state;
      return {
        ...state,
        locked: false,
        selected: [],
        cards: state.cards.map((card) =>
          state.selected.includes(card.id) && card.state === 'revealed' ? { ...card, state: 'hidden' } : card,
        ),
      };
    }

    case 'flip': {
      // Todo clique inválido morre aqui: tabuleiro travado, carta já virada,
      // carta já resolvida ou clique repetido na mesma carta.
      if (state.locked) return state;
      const card = state.cards.find((item) => item.id === action.id);
      if (!card || card.state !== 'hidden') return state;

      const selected = [...state.selected, card.id];
      const cards = state.cards.map((item) => (item.id === card.id ? { ...item, state: 'revealed' as const } : item));

      if (selected.length < 2) {
        return { ...state, cards, selected, started: true };
      }

      const [firstId, secondId] = selected as [string, string];
      const first = cards.find((item) => item.id === firstId)!;
      const isMatch = first.pairId === card.pairId;
      const token = state.token + 1;

      if (isMatch) {
        return {
          ...state,
          started: true,
          moves: state.moves + 1,
          matches: state.matches + 1,
          selected: [],
          locked: false,
          lastMatch: { ids: [firstId, secondId], token },
          token,
          cards: cards.map((item) =>
            item.pairId === card.pairId ? { ...item, state: 'matched' as const } : item,
          ),
        };
      }

      return {
        ...state,
        cards,
        selected,
        started: true,
        moves: state.moves + 1,
        locked: true,
        lastMiss: { ids: [firstId, secondId], token },
        token,
      };
    }

    default:
      return state;
  }
}

export function useMemoryGame(glyphs: GlyphName[]) {
  const [state, dispatch] = useReducer(reducer, glyphs, init);
  const [seconds, setSeconds] = useState(0);

  const totalPairs = glyphs.length;
  const isComplete = state.matches === totalPairs && totalPairs > 0;

  // Cronômetro: começa na primeira carta virada, para no último par.
  useEffect(() => {
    if (!state.started || isComplete) return;
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [state.started, isComplete]);

  // Devolve o par errado depois da pausa de leitura.
  useEffect(() => {
    if (!state.locked) return;
    const id = window.setTimeout(() => dispatch({ type: 'resolveMiss' }), MISS_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [state.locked, state.token]);

  // Espelho do estado só para o log: precisamos saber por que um clique foi
  // recusado antes de o reducer descartá-lo em silêncio.
  const stateRef = useRef(state);
  stateRef.current = state;

  const flip = useCallback((id: string) => {
    const atual = stateRef.current;
    const card = atual.cards.find((item) => item.id === id);

    if (!card) {
      log('jogo', 'clique ignorado — carta inexistente', { id });
      return;
    }
    if (atual.locked) {
      log('jogo', 'clique ignorado — tabuleiro travado exibindo o erro', { id });
      return;
    }
    if (card.state !== 'hidden') {
      log('jogo', 'clique ignorado — carta já está aberta', { id, estado: card.state });
      return;
    }

    log('jogo', 'virar carta', { id, simbolo: card.glyph, abertas: atual.selected.length });
    dispatch({ type: 'flip', id });
  }, []);

  const glyphsRef = useRef(glyphs);
  glyphsRef.current = glyphs;

  const restart = useCallback(() => {
    log('jogo', 'tabuleiro reembaralhado');
    setSeconds(0);
    dispatch({ type: 'restart', glyphs: glyphsRef.current });
  }, []);

  return useMemo(
    () => ({
      cards: state.cards,
      moves: state.moves,
      matches: state.matches,
      totalPairs,
      seconds,
      isComplete,
      isLocked: state.locked,
      hasStarted: state.started,
      lastMatch: state.lastMatch,
      lastMiss: state.lastMiss,
      flip,
      restart,
    }),
    [state, totalPairs, seconds, isComplete, flip, restart],
  );
}

export type MemoryGameApi = ReturnType<typeof useMemoryGame>;
