import { useCallback, useEffect, useRef, useState } from 'react';
import type { Direction } from '../lib/input';

interface Props {
  onDirectionChange: (dir: Direction) => void;
}

type Button = 'up' | 'down';

const Chevron = ({ up }: { up: boolean }) => (
  <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" focusable="false">
    <path
      d={up ? 'M5 15l7-7 7 7' : 'M5 9l7 7 7-7'}
      fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"
    />
  </svg>
);

/** Hold-to-move buttons. Tracks pointers by id so two fingers can't leave a button stuck. */
export function TouchControls({ onDirectionChange }: Props) {
  const pointers = useRef<Record<Button, Set<number>>>({ up: new Set(), down: new Set() });
  const [pressed, setPressed] = useState<Record<Button, boolean>>({ up: false, down: false });

  const publish = useCallback(() => {
    const { up, down } = pointers.current;
    setPressed({ up: up.size > 0, down: down.size > 0 });
    onDirectionChange(((down.size > 0 ? 1 : 0) - (up.size > 0 ? 1 : 0)) as Direction);
  }, [onDirectionChange]);

  const releaseAll = useCallback(() => {
    pointers.current.up.clear();
    pointers.current.down.clear();
    publish();
  }, [publish]);

  // A finger lifted while the page is hidden or the app is backgrounded never fires pointerup.
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) releaseAll(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', releaseAll);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', releaseAll);
      onDirectionChange(0);
    };
  }, [releaseAll, onDirectionChange]);

  const handlers = (button: Button) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      pointers.current[button].add(e.pointerId);
      publish();
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      pointers.current[button].delete(e.pointerId);
      publish();
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      pointers.current[button].delete(e.pointerId);
      publish();
    },
    onLostPointerCapture: (e: React.PointerEvent<HTMLButtonElement>) => {
      pointers.current[button].delete(e.pointerId);
      publish();
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  return (
    <div className="touch-controls">
      <button
        type="button"
        className="touch-btn"
        aria-label="Move paddle up"
        data-pressed={pressed.up}
        {...handlers('up')}
      >
        <Chevron up />
      </button>
      <button
        type="button"
        className="touch-btn"
        aria-label="Move paddle down"
        data-pressed={pressed.down}
        {...handlers('down')}
      >
        <Chevron up={false} />
      </button>
    </div>
  );
}
