import { colorPrimary, colorHarvest } from './farmDetailsTokens';

const primary = colorPrimary;
const harvest = colorHarvest;

export function SowIcon({ size = 14, stroke = primary, strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21V12" />
      <path d="M12 12C9 12 7 9 7 5c3 1 5 3 5 7Z" />
      <path d="M12 12C15 12 17 9 17 5c-3 1-5 3-5 7Z" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function HarvestIcon({ size = 14, stroke = harvest, strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 12.5a6 6 0 1 1 9.5 4.86" />
      <path d="M16.5 16.86 21 21.5" />
    </svg>
  );
}

export function LeafIcon({ size = 20, stroke = colorPrimary, strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V13" />
      <path d="M12 13C12 13 5 12 5 5C12 5 12 13 12 13Z" />
      <path d="M12 13C12 13 19 12 19 5C12 5 12 13 12 13Z" />
    </svg>
  );
}

export function AreaIcon({ size = 16, stroke = primary, strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  );
}

export function TrendIcon({ size = 16, stroke = '#FFFFFF', strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  );
}

export function ChevronIcon({ size = 14, stroke = 'currentColor', strokeWidth = 2, direction = 'right' }) {
  const rotate = { right: 0, left: 180, down: 90, up: -90 }[direction];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
         style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function CloseIcon({ size = 16, stroke = 'currentColor', strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function VegetativeIcon({ size = 14, stroke = '#006400', strokeWidth = 2.4 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 20c0-6 4-10 10-12" />
      <path d="M6 20c0-4-2-6-4-6" />
    </svg>
  );
}
