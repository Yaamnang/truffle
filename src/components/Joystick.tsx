import { useCallback, useEffect, useRef, useState } from 'react';
import type { Direction } from '../lib/input';
import { clampJoystick, joystickDirection, JOYSTICK_TRAVEL } from '../lib/controls';
import { controlsCopy } from '../lib/copy';
import { useReleaseOnHide } from '../hooks/useReleaseOnHide';
import { Chevron } from './icons';

interface Props {
  onDirectionChange: (dir: Direction) => void;
}

interface Drag {
  pointerId: number;
  x: number;
  y: number;
  offset: number;
  toFrame: DOMMatrix;
}

// Pointer events report physical screen coordinates, but an upright phone turns #root (the app's frame) a
// quarter turn, so "up" for the player is sideways on the glass. The inverse of #root's transform maps a
// finger movement back into the frame. #root is the only transformed ancestor of the controls.
function screenToFrame(): DOMMatrix {
  const root = document.getElementById('root');
  const transform = root ? getComputedStyle(root).transform : 'none';
  const matrix = transform === 'none' ? new DOMMatrix() : new DOMMatrix(transform);
  // Movement is a difference of two points, so translation plays no part
  matrix.e = 0;
  matrix.f = 0;
  return matrix.inverse();
}

/**
 * A vertical stick: drag up or down from wherever the thumb lands. The paddle moves at full speed once the drag
 * passes the deadzone, and stops when the thumb lifts. The knob's position is written straight to its style so a
 * drag re-renders only when the direction changes.
 */
export function Joystick({ onDirectionChange }: Props) {
  const knobRef = useRef<HTMLSpanElement>(null);
  const drag = useRef<Drag | null>(null);
  const [active, setActive] = useState(false);
  const [dir, setDir] = useState<Direction>(0);

  const update = useCallback((offset: number) => {
    knobRef.current?.style.setProperty('--offset', String(offset / JOYSTICK_TRAVEL));
    const next = joystickDirection(offset);
    setDir(next);
    onDirectionChange(next);
  }, [onDirectionChange]);

  const release = useCallback(() => {
    drag.current = null;
    setActive(false);
    update(0);
  }, [update]);

  useReleaseOnHide(release);
  useEffect(() => () => onDirectionChange(0), [onDirectionChange]);

  const end = (e: React.PointerEvent) => {
    if (drag.current?.pointerId === e.pointerId) release();
  };

  return (
    <div
      className="joystick"
      role="group"
      aria-label={controlsCopy.joystick}
      data-active={active}
      data-dir={dir}
      onPointerDown={(e) => {
        if (drag.current) return; // a second finger on the stick is ignored
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, offset: 0, toFrame: screenToFrame() };
        setActive(true);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (d?.pointerId !== e.pointerId) return;
        const moved = d.toFrame.transformPoint({ x: e.clientX - d.x, y: e.clientY - d.y });
        d.x = e.clientX;
        d.y = e.clientY;
        // Clamping each step drags the origin along past the end of travel, so reversing is always quick
        d.offset = clampJoystick(d.offset + moved.y);
        update(d.offset);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="joystick-mark" data-mark="up"><Chevron up size={20} /></span>
      <span className="joystick-knob" ref={knobRef} />
      <span className="joystick-mark" data-mark="down"><Chevron up={false} size={20} /></span>
    </div>
  );
}
