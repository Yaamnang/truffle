import { useCallback, useState } from 'react';

export type ControlSide = 'left' | 'right';

// Which side of the court the on-screen buttons sit on. Every match starts on the right; the choice is
// deliberately not remembered, so a side picked in an earlier game can never surprise the next one.
export function useControlSide(): [ControlSide, () => void] {
  const [side, setSide] = useState<ControlSide>('right');
  const toggle = useCallback(() => setSide((current) => (current === 'left' ? 'right' : 'left')), []);
  return [side, toggle];
}
