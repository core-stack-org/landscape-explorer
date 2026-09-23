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
