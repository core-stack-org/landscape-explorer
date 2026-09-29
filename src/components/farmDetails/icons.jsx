import { colorPrimary, colorHarvest, colorConfidenceHigh } from './farmDetailsTokens';

export function SowIcon({ size = 14, stroke = colorPrimary, strokeWidth = 1.8 }) {
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

export function HarvestIcon({ size = 14, stroke = colorHarvest, strokeWidth = 2.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 12.5a6 6 0 1 1 9.5 4.86" />
      <path d="M16.5 16.86 21 21.5" />
    </svg>
  );
}

// Growing/vegetative-stage marker for the Monthly table's in-between rows —
// distinct from Sow (seedling) and Harvest (sickle) per the reviewed mock's
// three-state legend (Sowing / Vegetative / Harvest).
export function VegetativeIcon({ size = 14, stroke = colorConfidenceHigh, strokeWidth = 2.4 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 20c0-6 4-10 10-12" />
      <path d="M6 20c0-4-2-6-4-6" />
    </svg>
  );
}
