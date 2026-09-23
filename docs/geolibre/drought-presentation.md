# Drought map presentation

The two source layers describe different aspects of drought at microwatershed scale. Source fields are preserved; presentation fields are calculated locally on load. These summaries are not official drought declarations or evidence of crop failure.

## Peak intensity

`drought_peak_intensity` is the highest weekly intensity recorded across valid observed years: None, Mild, Moderate or Severe. A single severe week is sufficient for a Severe **peak**; it does not mean a whole season was severe. `drought_peak_YYYY` makes the same summary for each year, and `drought_stress_weeks_YYYY` retains moderate plus severe duration. These fields are available in the attributes and GeoLibre style-property selector.

Each year requires nonnegative integer counts for `w_no_YYYY`, `w_mld_YYYY`, `w_mod_YYYY`, and `w_sev_YYYY`, with at least one observed week. Missing or invalid years are excluded and remain null in annual fields. `drought_observed_years` and `drought_year_count` expose coverage; no valid years means missing data, not None. Years are discovered from the data rather than fixed to 2017–2022.

The supplied technical documentation defines weekly classes using rainfall triggers and impact indicators. It does not establish the proposed 0–3, 4–7 and 8+ week bins as intensity classes. Its separate discussion of more than five moderate/severe weeks and field verification is not used as an automatic drought declaration.

## Sources

- Supplied technical documents: `drought frequency and intensity.tex` and `drought causality.tex` (private documentation).
- Supplied drought and drought-causality CSV samples (private; not committed).
- CoRE Stack backend: `computing/drought/drought_causality.py`, `getWeekVector`, `count1`, `count2` (path definitions and published top-three selection).
- [Research implementation referenced by the documentation](https://github.com/tirumalbodavula/MTechProject/blob/main/Know%20Your%20Landscape/Drought%20Causality/DroughtCausality_v2.ipynb).

## Recorded impacts

`drought_dominant_impact` groups the published `se_mo_YYYY` pathway counts by their impact combination and sums across valid years. `drought_impact_YYYY` provides the annual equivalent. The default classes are:

| Published pathway | Impact combination |
| --- | --- |
| Moderate paths 1–6 | Crop area + soil moisture stress |
| Moderate paths 7–12 | Crop area + vegetation stress |
| Moderate paths 13–18 | Soil moisture + vegetation stress |
| Severe paths 1–3 | Combined crop, soil and vegetation stress |

For each consecutive group of three paths, the trigger is dry spell, rainfall deviation, or SPI. Thus path 1/2/3 cannot be interpreted as sowing/soil/vegetation. Equal highest grouped counts produce **Mixed / tied impacts**. An empty valid record produces **No recorded moderate/severe pathway**, which does not rule out mild drought. Missing, malformed, negative, fractional or unknown pathway records remain null. Coverage is reported in `drought_impact_observed_years` and `drought_impact_year_count`.

Only the published top-three pathways are available. The dominant class is therefore a summary of **recorded pathways**, not all drought weeks or a proven root cause. Mild trigger/impact scores are retained in their original fields, not mixed with moderate/severe counts: they use different scoring and top-three truncation. No dry-spell join or intensity-derived fallback is used. This keeps the second layer independent and complementary.

Grey marks no recorded moderate/severe pathway, while dark missing-data fill marks an unavailable classification. Distinct colors and text labels identify the impact combinations. Source geometry and coordinate handling remain unchanged; derived attributes use the existing GeoLibre popup and style controls on desktop and mobile.
