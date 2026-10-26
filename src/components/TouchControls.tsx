import { useCallback, useEffect, useRef, useState } from 'react';
import type { Direction } from '../lib/input';
import type { ControlLayout } from '../lib/controls';
import { useControlPrefs } from '../hooks/useControlPrefs';
import { useReleaseOnHide } from '../hooks/useReleaseOnHide';
import { controlsCopy } from '../lib/copy';
import { Chevron } from './icons';
import { ControlsButton } from './ControlsButton';
import { Joystick } from './Joystick';

interface Props {
  onDirectionChange: (dir: Direction) => void;
  onOpenControls: () => void;
}

/** The on-screen controls in the player's chosen layout. */
export function TouchControls(props: Props) {
  const { layout } = useControlPrefs();
  // Keyed by layout so switching layouts always starts with nothing held
  return <ControlColumns key={layout} layout={layout} {...props} />;
}

/**
 * A column on each side of the court, always both, so the court never moves. Flip only swaps which column the
 * controls sit in; the controls button stays at the top of the right-hand column whatever the layout.
 */
function ControlColumns({ layout, onDirectionChange, onOpenControls }: Props & { layout: ControlLayout }) {
  const { flipped } = useControlPrefs();
  const holdButton = useHoldButtons(onDirectionChange);

  let left: React.ReactNode = null;
  let right: React.ReactNode = null;
  if (layout === 'split') {
    // Up on the left and down on the right; flipped swaps them
    left = holdButton(flipped ? 'down' : 'up');
    right = holdButton(flipped ? 'up' : 'down');
  } else {
    const control = layout === 'joystick'
      ? <Joystick onDirectionChange={onDirectionChange} />
      : <div className="control-stack">{holdButton('up')}{holdButton('down')}</div>;
    if (flipped) left = control;
    else right = control;
  }

  return (
    <>
      <div className="control-col" data-slot="start">{left}</div>
      <div className="control-col" data-slot="end">
        <ControlsButton compact onOpen={onOpenControls} />
        {right}
      </div>
    </>
  );
}

type Button = 'up' | 'down';

/** Hold-to-move buttons. Tracks pointers by id so two fingers can't leave a button stuck. */
function useHoldButtons(onDirectionChange: (dir: Direction) => void) {
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

  useReleaseOnHide(releaseAll);
  useEffect(() => () => onDirectionChange(0), [onDirectionChange]);

  const release = (button: Button) => (e: React.PointerEvent<HTMLButtonElement>) => {
    pointers.current[button].delete(e.pointerId);
    publish();
  };

  return (button: Button) => (
    <button
      type="button"
      className="touch-btn"
      aria-label={controlsCopy[button]}
      data-pressed={pressed[button]}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current[button].add(e.pointerId);
        publish();
      }}
      onPointerUp={release(button)}
      onPointerCancel={release(button)}
      onLostPointerCapture={release(button)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Chevron up={button === 'up'} />
    </button>
  );
}
