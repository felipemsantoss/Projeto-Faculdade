import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Movimento reduzido: encurtamos animações, mas mantemos todo o feedback. */
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

/** Só ligamos cursor customizado e parallax onde existe mouse de verdade. */
export const useFinePointer = () => useMediaQuery('(hover: hover) and (pointer: fine)');
