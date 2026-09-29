# Farm Details Panel — Implementation Plan

Sep 27, 2026

## Overview

Replace the modal-based farm details view (`FarmDetailsModal` in `kyl_rightSidebar.jsx`) with an in-right-panel view that opens when a user clicks a farm boundary on the map and selects "Show Details" from the popup. The panel has two modes, toggled by the user: **Yearly** (default) and **Monthly**, both scoped to one agri year at a time (Jun–Jul, selectable via a year dropdown).

The new view sources data from the same GraphQL `annual`/`monthly` queries already wired up (`getFarmTimeseries.js`), with an updated `annual` schema that now includes `crop1/conf1`, `crop2/conf2`, `crop3/conf3`, `cropStartDate`, `cropEndDate` per record. `kharifMai`, `kharifWaterStress`, and `kharifSevereStress` are excluded from this view entirely.

A reviewed mock of both views (desktop-width right-panel mockups) is available at: https://claude.ai/artifact/7HkJYC83DAAo9QRcLC5dv8 — use it as the visual source of truth for layout, spacing, and copy. This doc specifies the implementation: data mapping, component structure, and step-by-step tasks.

## Scope

**In scope**

- New `FarmDetailsPanel` component rendered inline in the right sidebar (replacing the modal), with Yearly and Monthly sub-views.
- Yearly/Monthly toggle + agri-year dropdown.
- Crop identity card (primary crop + confidence, up to 2 secondary crops + confidence).
- Sown/Harvested date cards.
- Field & water balance stats: Area, MAI, AET, PET.
- Yearly agricultural-practices timeline (sowing/harvest markers only, per the reviewed mock).
- Monthly water-balance table (Jun–Jul, full agri year, AET/PET/MAI per month).
- Re-skin to the app's actual color palette (see Design tokens section).
- Wiring the panel into the existing farm-boundary click → popup → "Show Details" flow already implemented in `kyl_rightSidebar.jsx`.

**Out of scope (this change)**

- Any change to the PMTiles farm-boundary layer rendering, styling, or toggle button.
- Any change to the GraphQL server/schema itself — this plan assumes the annual query already returns `crop1/conf1`, `crop2/conf2`, `crop3/conf3`, `cropStartDate`, `cropEndDate` as described by the user.
- CORS/backend fixes (`CORSMiddleware`, port mismatch) — tracked separately, called out again under Assumptions.
- The unrelated "stuck filter" selection bug and `_cancelImageWatch` cleanup — tracked separately.

## Data model

### Annual record shape (per the user's updated schema)

```
{
  year: string,              // e.g. "2025-26"
  crop1: string, conf1: number,
  crop2: string, conf2: number,
  crop3: string, conf3: number,
  cropStartDate: string,     // ISO date
  cropEndDate: string,       // ISO date
  aet: number,               // mm
  pet: number,               // mm
  mai: number,               // 0-1
  area: number                // m^2
  // kharifMai, kharifWaterStress, kharifSevereStress: present in the API response but NOT read or displayed
}
```

The query returns an array of these records (per the existing `getFarmTimeseries.js` GraphQL call). **Sown/harvest dates and the primary crop badge always come from the LAST element of the `annual` array** (most recent agri year), per the user's instruction: "The last sowing and harvesting dates we can \[get\] from the last object in the array."

### Confidence level mapping

A pure function, e.g. `getConfidenceLevel(conf)`:

- `conf > 0.7` → `"High"`
- `0.5 <= conf <= 0.7` → `"Medium"`
- `conf < 0.5` → `"Low"`

Apply to `conf1`, `conf2`, `conf3` independently. Only render a secondary crop chip (`crop2`/`crop3`) if that crop name is non-empty/non-null — don't render empty "Also detected" chips.

### Excluded fields

`kharifMai`, `kharifWaterStress`, `kharifSevereStress` must not be destructured, displayed, or passed as props anywhere in the new components (explicit user instruction, twice repeated).

### Monthly record shape

Already implemented per the earlier monthly GraphQL query — one record per month with `aet`, `pet`, `mai`. The Monthly view iterates a full agri-year month sequence (Jun–Jul, 14 months across the year boundary) and looks up each month's record by key; a month with no data renders with reduced emphasis (dimmed row) rather than being hidden, so the water-balance record reads as continuous.

## Component architecture

### New files

| File | Purpose |
| --- | --- |
| `src/components/farmDetails/FarmDetailsPanel.jsx` | Top-level panel: header (back button, Farm ID, close), Yearly/Monthly toggle, year dropdown; renders `FarmYearlyView` or `FarmMonthlyView` based on local state. |
| `src/components/farmDetails/FarmYearlyView.jsx` | Crop identity card, Sown/Harvested cards, water-balance stat grid, agricultural-practices timeline. |
| `src/components/farmDetails/FarmMonthlyView.jsx` | Compact crop-context strip, monthly water-balance table. |
| `src/components/farmDetails/AgriTimeline.jsx` | The Jun–Jul timeline strip (sowing/harvest icons + dots + growing-period highlight), shared visual logic, takes `cropStartDate`/`cropEndDate` as props. |
| `src/components/farmDetails/farmDetailsUtils.js` | `getConfidenceLevel(conf)`, `buildAgriYearMonths(startDate, endDate)`, `formatDate(iso)`, month-lookup helpers for the Monthly table. |
| `src/components/farmDetails/icons.jsx` | Small exported icon components: `SowIcon`, `HarvestIcon`, `BackIcon`, `CloseIcon`, `ChevronIcon` — inline SVGs matching the reviewed mock (see Icon components section). |
| `src/components/farmDetails/farmDetailsTokens.js` | Exported color constants (see Design tokens section) so colors aren't hardcoded per-component. |

### Modified files

| File | Change |
| --- | --- |
| `kyl_rightSidebar.jsx` | Remove `FarmDetailsModal` and its rendering. Replace with conditional render of `<FarmDetailsPanel />` in place of (or above) the existing selection-details panel content, gated by a new state flag (see State management). The "Show Details" popup button's `onClick` now sets that flag instead of opening a modal. |

### Removed

- `FarmDetailsModal` component and its JSX (currently inline in `kyl_rightSidebar.jsx`) — delete once `FarmDetailsPanel` is wired up and confirmed working, not before (keep the app functional at every commit).

## Design tokens

Derived from the React app's actual `tailwind.config.js` palette (confirmed by the user) rather than the mock's placeholder colors. Put these in `farmDetailsTokens.js` as named exports so no component hardcodes a hex value.

| Token | Hex | Used for |
| --- | --- | --- |
| `colorPrimary` | `#8B5CF6` | Sowing accent (icon fill, badge, timeline marker), active/interactive elements |
| `colorPrimaryHover` | `#7C3AED` | Hover state on interactive elements |
| `colorPrimaryLight` | `#EDE9FE` | Chip/badge backgrounds, toggle track, table header row, icon chip backgrounds |
| `colorBorder` | `#DDD6FE` | Card borders, dividers, row separators |
| `colorTextPrimary` | `#332E4A` | Headings, primary values (dates, stat numbers) |
| `colorTextSecondary` | `#614D4D` | Labels, captions-adjacent body text, default icon stroke |
| `colorTextMuted` | `#A9A9A9` | Uppercase section labels, "no active crop" state, fallow-month labels |
| `colorHarvest` | `#FFA500` | Harvest accent (icon fill, badge, timeline marker), medium-confidence indicator |
| `colorConfidenceHigh` | `#006400` | High-confidence text/dot |
| `colorConfidenceLow` | `#B91C1C` | Low-confidence text/dot |
| `colorConfidenceLowBg` | `#FEF2F2` | Low-confidence chip background (exact alert pair from the app) |
| `colorPageBg` | `#F7F7FA` | Panel page background |

Note for Claude Code: `colorPageBg` and the mid-tone timeline highlight (`#B8A9F8`, used only inside `AgriTimeline.jsx` for the active growing-period line segment) are values derived to sit between the given brand tokens — not literal entries in `tailwind.config.js`. Flag if design wants these swapped for exact theme tokens once real ones are confirmed.

## Icon components

Export as small stroke-SVG React components in `icons.jsx`, each accepting `size` and `color`/`stroke` props (default to the design tokens above). Path data taken directly from the reviewed mock:

```jsx
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

export function HarvestIcon({ size = 14, stroke = colorHarvest, strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 12.5a6 6 0 1 1 9.5 4.86" />
      <path d="M16.5 16.86 21 21.5" />
    </svg>
  );
}
```

`SowIcon` renders a seedling (stem + two curved leaves) — used for the Sown date card, the timeline's sowing markers, and the Monthly table's sowing rows. `HarvestIcon` renders a sickle — used for the Harvested date card, the timeline's harvest marker, and the Monthly table's harvest row. Do not reintroduce the earlier gear/box icon shapes that were tried and rejected during design review.

## Yearly view (`FarmYearlyView.jsx`)

1. **Crop identity card**
   - Primary crop name = `crop1` (last annual record), confidence badge = `getConfidenceLevel(conf1)`, colored per token (green/orange/red on light tint background using `rgba()` of the same hue at \~10% alpha — see mock).
   - "Also detected" row: render a chip per non-empty `crop2`/`crop3` with their own confidence dot + label. Omit the row entirely if neither exists.
2. **Sown / Harvested cards** (two side-by-side cards)
   - Sown: `SowIcon` + formatted `cropStartDate`.
   - Harvested: `HarvestIcon` + formatted `cropEndDate`.
3. **Field & water balance** (2x2 stat grid): Area (convert m² → ha, 2 decimal places), MAI (2 decimal places, unitless), AET (mm), PET (mm).
4. **Agricultural practices timeline** (`AgriTimeline.jsx`)
   - A single horizontal strip covering the full agri year the year dropdown has selected (14 month slots: the selected year's Jun through the following year's Jul).
   - Only the sowing month (`cropStartDate`) and harvest month (`cropEndDate`) get the large icon marker (`SowIcon`/`HarvestIcon` in a 26px filled circle). Every other month is a small neutral dot — do **not** give in-between months their own colored/iconed markers (this was explicitly simplified during design review to avoid visual clutter).
   - The baseline line runs the full width in `colorPrimaryLight`; the segment between the sowing and harvest markers (the "growing period") is drawn in a slightly stronger tone to stand out from the baseline — don't let the two collapse to the same color (a real bug hit during the mock: verify the highlighted segment is visibly distinct from the baseline before shipping).
   - Legend: Sowing / Harvest / No active crop (three items only — no separate "vegetative" or "fallow" legend entries in this view).
   - Do **not** label any portion of the timeline "Kharif"/"Rabi"/"Zaid" — season boundaries vary by region in India; use plain date ranges instead if a sub-label is ever needed.

## Monthly view (`FarmMonthlyView.jsx`)

1. **Compact crop-context strip**: crop name + agri-year range + confidence badge, single row, above the table (crop doesn't change month to month, so this is just orientation, not a repeat of the full identity card).
2. **Monthly water-balance table**: one row per month across the full agri year (Jun–Jul, 14 rows), columns: icon, Month (+ inline "sown 14th"/"harvested 2nd" annotation on the sowing/harvest rows), AET, PET, MAI (numeric value + small inline bar, bar fill = `colorPrimary`, track = `colorPrimaryLight`, width proportional to the MAI value).
   - Sowing row and harvest row get `SowIcon`/`HarvestIcon`.
   - Months with no active crop (outside `cropStartDate`–`cropEndDate`) still show real AET/PET/MAI numbers (the underlying water balance exists whether or not a crop is planted) — don't show placeholder dashes. Render these rows at reduced opacity (\~0.7) and with `colorTextMuted` for numbers, to visually de-emphasize without hiding data.
   - Row order always follows calendar order starting from the agri-year's Jun, wrapping into the next calendar year for Jan–Jul.
3. Legend: Sowing / Vegetative / Harvest (this view keeps the vegetative-growth distinction in its per-row icon, unlike the simplified Yearly timeline — that's intentional, the two views serve different levels of detail).

## State management

- `kyl_rightSidebar.jsx` already has farm-boundary click handling, a popup overlay, and `farmPopupOverlayRef`/`showFarmDetailsRef` wired from the earlier PMTiles work. Add a new piece of state, e.g. `const [selectedFarm, setSelectedFarm] = useState(null)` (holds `{ farmId, stateLabel, districtLabel, blockLabel }` or `null`).
- The popup's "Show Details" button's `onClick` sets `selectedFarm` instead of opening a modal (remove the `FarmDetailsModal` open call).
- `FarmDetailsPanel` is rendered conditionally: `{selectedFarm && <FarmDetailsPanel farm={selectedFarm} onClose={() => setSelectedFarm(null)} />}`, placed where the existing selection-details panel renders (they are mutually exclusive views of the right sidebar — confirm with design whether farm details should replace or stack above the MWS/village selection panel; default assumption below).
- `FarmDetailsPanel` owns its own local state: `const [view, setView] = useState('yearly')` (or `'monthly'`) and `const [selectedYear, setSelectedYear] = useState(defaultYear)`.
- Data fetching: on mount (or when `farm`/`selectedYear` changes), call the existing `getFarmTimeseries.js` fetch function with `{ state, district, block, farmId }`, store `{ annual, monthly }` in local state, with loading/error states shown in the panel body (reuse whatever loading/error pattern the rest of `kyl_rightSidebar.jsx` already uses — don't invent a new one).
- On close (`onClose`), clear `selectedFarm` and remove/hide the map popup overlay, mirroring how the modal's close handler worked.

## Implementation checklist

- [ ] Create `farmDetailsTokens.js` with the color constants from Design tokens.
- [ ] Create `icons.jsx` with `SowIcon`, `HarvestIcon`, `BackIcon`, `CloseIcon`, `ChevronIcon`.
- [ ] Create `farmDetailsUtils.js`: `getConfidenceLevel`, `buildAgriYearMonths`, `formatDate`, month-key lookup helper.
- [ ] Build `AgriTimeline.jsx` (shared by the Yearly view) and verify the growing-period segment is visually distinct from the baseline.
- [ ] Build `FarmYearlyView.jsx` per the Yearly view section, using mock data first (hardcoded sample matching the annual schema) to validate layout against the reviewed mock.
- [ ] Build `FarmMonthlyView.jsx` per the Monthly view section, same mock-data-first approach.
- [ ] Build `FarmDetailsPanel.jsx` wrapping both views with the toggle + year dropdown.
- [ ] Wire real data: connect `FarmDetailsPanel` to `getFarmTimeseries.js`, remove hardcoded mock data.
- [ ] Add `selectedFarm` state and wire the popup's "Show Details" button to it, in `kyl_rightSidebar.jsx`.
- [ ] Render `FarmDetailsPanel` conditionally in the right sidebar; confirm it doesn't visually collide with the existing MWS/village selection panel.
- [ ] Remove `FarmDetailsModal` and its now-dead imports/handlers.
- [ ] Manually verify against the reviewed mock: https://claude.ai/artifact/7HkJYC83DAAo9QRcLC5dv8
- [ ] Confirm `kharifMai`/`kharifWaterStress`/`kharifSevereStress` do not appear anywhere in the new components (grep for them).

## Testing & verification

- Click a farm boundary → popup shows `farm_id`/`area_m2` → "Show Details" opens `FarmDetailsPanel` in the right sidebar (not a modal).
- Toggle between Yearly and Monthly — both render without layout shift or console errors.
- Switch the year dropdown — confirm data refetches (or re-slices, if all years are fetched at once) and both views update.
- Confidence badges: test with a `conf1` just above/below each threshold (0.7, 0.5) to confirm the boundary logic in `getConfidenceLevel` matches the spec exactly (`> 0.7` High, not `>= 0.7`).
- A farm with only 1 detected crop (`crop2`/`crop3` empty) — confirm the "Also detected" section doesn't render an empty/broken chip.
- Close the panel (`onClose`) — confirm the map popup overlay is also removed, not just the panel.
- Visual diff against the reviewed mock at each of the three review rounds it went through (icon shapes, single-line timeline, full agri-year coverage, and the final palette pass) — all of those decisions are final, don't regress to an earlier version.
- Confirm no `kharifMai`/`kharifWaterStress`/`kharifSevereStress` references remain (`grep -r "kharifMai\|kharifWaterStress\|kharifSevereStress" src/components/farmDetails/`).

## Open questions / assumptions

- **Panel placement**: this plan assumes `FarmDetailsPanel` replaces the MWS/village selection panel content while a farm is selected (mutually exclusive), rather than stacking. Confirm with the user/design before implementing if this wasn't settled elsewhere.
- **GraphQL CORS + port**: earlier in this project the user hit a `405` CORS preflight failure on `/graphql/v1` and a port mismatch (`8000` in the spec vs `8080` actually running). `CORSMiddleware` was recommended for the FastAPI `main.py` but not confirmed fixed. Verify the endpoint is reachable before wiring real data — don't debug this panel's data flow against a broken backend connection.
- **"Stuck filter" bug**: unrelated to this panel, but still open in the same codebase (`setManualSelectedMWS([])` needs to be called in `handleFilterSelection`/`handlePatternSelection`/`handlePatternRemoval`/`handleIndicatorRemoval`). Not blocking, but flag if it resurfaces during this work.
- **Multi-word S3 key slugging**: `buildPmtilesUrl` lowercases district/block names for the PMTiles S3 path; how multi-word names are slugged (underscore/hyphen/none) in the real bucket was never confirmed. Not this panel's concern directly, but affects whether farm boundaries load at all for such blocks.
- **Design tokens are inferred**, not copied from a live component: confirm the exact hex values against a real rendered component (e.g. inspect an existing button or card in the browser) before final sign-off, since the user provided them from memory/`tailwind.config.js` review rather than a design-system export.
