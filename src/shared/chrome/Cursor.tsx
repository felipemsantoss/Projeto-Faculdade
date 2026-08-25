import { useEffect, useRef } from 'react';
import { useFinePointer, useReducedMotion } from '../../hooks/useMediaQuery';
import { lerp } from '../../lib/shuffle';
import './cursor.css';

/**
 * Cursor de duas camadas: o ponto acompanha o mouse na hora, o anel chega
 * um quadro depois. Qualquer elemento com `data-cursor` altera o estado, e
 * `data-cursor-label` escreve uma legenda dentro do anel.
 *
 * Nada aqui é essencial: em telas de toque, ou sem mouse fino, o componente
 * simplesmente não monta e o cursor nativo continua valendo.
 */
export function Cursor() {
  const finePointer = useFinePointer();
  const reducedMotion = useReducedMotion();
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  const enabled = finePointer && !reducedMotion;

  useEffect(() => {
    if (!enabled) return;

    const ring = ringRef.current;
    const dot = dotRef.current;
    const label = labelRef.current;
    if (!ring || !dot || !label) return;

    document.body.dataset.customCursor = 'on';

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const eased = { ...target };
    let frame = 0;
    let visible = false;

    const render = () => {
      eased.x = lerp(eased.x, target.x, 0.18);
      eased.y = lerp(eased.y, target.y, 0.18);
      ring.style.transform = `translate3d(${eased.x}px, ${eased.y}px, 0) translate(-50%, -50%)`;
      dot.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`;
      frame = window.requestAnimationFrame(render);
    };
    frame = window.requestAnimationFrame(render);

    const onMove = (event: PointerEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;

      if (!visible) {
        visible = true;
        ring.dataset.visible = 'true';
        dot.dataset.visible = 'true';
      }

      const hit = (event.target as HTMLElement | null)?.closest?.('[data-cursor]') as HTMLElement | null;
      const variant = hit?.dataset.cursor ?? 'default';
      if (ring.dataset.variant !== variant) ring.dataset.variant = variant;

      const text = hit?.dataset.cursorLabel ?? '';
      if (label.textContent !== text) label.textContent = text;
    };

    const onLeave = () => {
      visible = false;
      ring.dataset.visible = 'false';
      dot.dataset.visible = 'false';
    };

    const onDown = () => (ring.dataset.pressed = 'true');
    const onUp = () => (ring.dataset.pressed = 'false');

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointerleave', onLeave);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
      delete document.body.dataset.customCursor;
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="cursor" aria-hidden="true">
      <div className="cursor__ring" ref={ringRef} data-variant="default" data-visible="false">
        <span className="cursor__label" ref={labelRef} />
      </div>
      <div className="cursor__dot" ref={dotRef} data-visible="false" />
    </div>
  );
}
