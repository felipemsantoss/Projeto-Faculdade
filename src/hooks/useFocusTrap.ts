import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Mantém o foco dentro de um overlay enquanto ele estiver aberto e devolve
 * o foco ao elemento de origem quando fecha.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onEscape?: () => void) {
  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const origin = document.activeElement as HTMLElement | null;
    const first = container.querySelector<HTMLElement>(FOCUSABLE);
    window.requestAnimationFrame(() => first?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onEscape?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;

      const head = items[0];
      const tail = items[items.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && (current === head || !container.contains(current))) {
        event.preventDefault();
        tail.focus();
      } else if (!event.shiftKey && current === tail) {
        event.preventDefault();
        head.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      origin?.focus?.();
    };
  }, [ref, active, onEscape]);
}
