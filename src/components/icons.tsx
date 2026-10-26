export const Chevron = ({ up, size = 32 }: { up: boolean; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
    <path
      d={up ? 'M5 15l7-7 7 7' : 'M5 9l7 7 7-7'}
      fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"
    />
  </svg>
);

/** Three slider rails with square handles: "adjust the controls". Square caps to match the game's blocky style. */
export const SlidersIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
    <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" />
    <rect x="13" y="3" width="5" height="6" fill="currentColor" />
    <rect x="5" y="9" width="5" height="6" fill="currentColor" />
    <rect x="15" y="15" width="5" height="6" fill="currentColor" />
  </svg>
);
