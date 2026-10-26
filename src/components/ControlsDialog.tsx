import { useEffect, useId, useRef } from 'react';
import { setControlPrefs, useControlPrefs } from '../hooks/useControlPrefs';
import { CONTROL_LAYOUTS, type ControlLayout } from '../lib/controls';
import { controlsCopy } from '../lib/copy';

interface Props {
  onClose: () => void;
}

// Upright phones rotate #root a quarter turn, and <dialog>.showModal() renders in the top layer outside that
// rotation, so this is a plain overlay inside #root with the modal behaviour (focus trap, Escape, focus
// return) done by hand. Every choice applies immediately; Done only closes.
export function ControlsDialog({ onClose }: Props) {
  const { layout, flipped } = useControlPrefs();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const panel = panelRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel?.querySelector<HTMLElement>('input:checked')?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      // Radio groups take one tab stop: the checked option.
      const stops = [...panel.querySelectorAll<HTMLElement>('input:checked, input[type="checkbox"], button')];
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (opener?.isConnected) opener.focus();
    };
  }, [onClose]);

  return (
    // A tap on the dimmed area outside the panel closes it, like Done
    <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panelRef}>
        <h2 className="dialog-title" id={titleId}>{controlsCopy.title}</h2>

        <fieldset className="layout-options">
          <legend className="visually-hidden">{controlsCopy.layoutGroup}</legend>
          {CONTROL_LAYOUTS.map((option) => (
            <label key={option} className="layout-option">
              <input
                type="radio"
                name="control-layout"
                className="visually-hidden"
                value={option}
                checked={layout === option}
                onChange={() => setControlPrefs({ layout: option })}
              />
              <span className="layout-card">
                <LayoutPreview layout={option} flipped={flipped} />
                <span className="layout-name">{controlsCopy.layouts[option].name}</span>
                <span className="layout-detail">{controlsCopy.layouts[option].detail}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="dialog-footer">
          <label className="switch">
            <input
              type="checkbox"
              role="switch"
              className="visually-hidden"
              checked={flipped}
              onChange={(e) => setControlPrefs({ flipped: e.target.checked })}
            />
            <span className="switch-track" aria-hidden="true"><span className="switch-knob" /></span>
            <span>{controlsCopy.flip}</span>
          </label>
          <button type="button" className="btn btn-sm" onClick={onClose}>{controlsCopy.done}</button>
        </div>
      </div>
    </div>
  );
}

/** A miniature phone screen: the court plus where the controls sit. Mirrored when flipped. */
function LayoutPreview({ layout, flipped }: { layout: ControlLayout; flipped: boolean }) {
  return (
    <svg className="layout-preview" viewBox="0 0 120 72" aria-hidden="true" focusable="false" data-flipped={flipped}>
      <g fill="none" stroke="currentColor" strokeWidth="2">
        {layout === 'split' ? (
          <>
            <rect x="4" y="27" width="18" height="18" />
            <path d="M8 39l5-5 5 5" />
            <rect x="26" y="8" width="68" height="56" opacity="0.5" />
            <path d="M60 10v52" strokeDasharray="3 4" opacity="0.35" />
            <rect x="98" y="27" width="18" height="18" />
            <path d="M102 33l5 5 5-5" />
          </>
        ) : (
          <>
            <rect x="4" y="8" width="88" height="56" opacity="0.5" />
            <path d="M48 10v52" strokeDasharray="3 4" opacity="0.35" />
            {layout === 'buttons' ? (
              <>
                <rect x="98" y="16" width="18" height="18" />
                <path d="M102 28l5-5 5 5" />
                <rect x="98" y="38" width="18" height="18" />
                <path d="M102 44l5 5 5-5" />
              </>
            ) : (
              <>
                <rect x="98" y="8" width="18" height="56" />
                <rect x="101" y="29" width="12" height="14" fill="currentColor" stroke="none" />
              </>
            )}
          </>
        )}
      </g>
    </svg>
  );
}
