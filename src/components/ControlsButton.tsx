import { useControlPrefs } from '../hooks/useControlPrefs';
import { controlsCopy } from '../lib/copy';
import { SlidersIcon } from './icons';

interface Props {
  onOpen: () => void;
  /** Icon only, for the narrow control column during a match. */
  compact?: boolean;
}

export function ControlsButton({ onOpen, compact = false }: Props) {
  const { layout } = useControlPrefs();
  const current = controlsCopy.layouts[layout].name;

  if (compact) {
    return (
      <button
        type="button"
        className="controls-icon-btn"
        aria-label={controlsCopy.openLabel(current)}
        aria-haspopup="dialog"
        onClick={onOpen}
      >
        <SlidersIcon size={22} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-sm btn-outline controls-btn"
      aria-label={controlsCopy.openLabel(current)}
      aria-haspopup="dialog"
      onClick={onOpen}
    >
      <SlidersIcon size={16} />
      <span>{controlsCopy.open}</span>
      <span className="controls-btn-value">{current}</span>
    </button>
  );
}
