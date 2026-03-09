# Issue: Improve map marker clustering for densely located plantation sites

## Issue Title
**Improve map marker clustering for densely located plantation sites**

---

## Description

### Problem
Many green markers (plantation sites) are stacked on top of each other on the map, making it hard to distinguish and interact with individual sites.

- **Overlapping markers:** In dense areas (e.g. under projects like *MBRDI Biodiversity Conservation - Kolar*), multiple plantation markers overlap heavily, forming large green blobs where individual sites cannot be identified.
- **Poor usability:** Users cannot easily click or select individual markers when several sites share the same or very close coordinates.
- **Scale:** With many sites (e.g. 117 sites over 114.39 hectares), overlapping is common and worsens user experience in concentrated regions.

### Expected behavior
- Individual plantation sites are distinguishable or accessible even in dense areas.
- Users can click or expand markers to view details for a specific site.
- At lower zoom levels, markers are grouped (clustered); when zoomed in or when a cluster is expanded, individual markers become visible and clickable.

### Suggested solution
- **Marker clustering:** Use a clustering approach (e.g. **Leaflet MarkerCluster**, **Supercluster**, or equivalent for the current map stack) so that:
  - At zoomed-out levels, nearby markers are grouped into a single cluster icon with a count.
  - Clusters show the number of sites they contain.
- **Expand on zoom:** When the user zooms in, clusters break apart into smaller clusters or individual markers.
- **Spiderfy (optional):** When a cluster is clicked before zooming, consider “spiderfy” behavior so markers spread out in a circle or fan, making each marker clickable without overlapping.

### Acceptance criteria
- [ ] Dense plantation markers are clustered when they would otherwise overlap.
- [ ] Cluster icons display the number of sites in the cluster.
- [ ] Zooming in splits clusters and reveals individual markers.
- [ ] Users can click individual markers to see site details.
- [ ] Optionally: cluster click expands markers (e.g. spiderfy) for easier selection.

### Labels (suggested)
`enhancement`, `map`, `ux`, `marker-clustering`

### Context
- **Screen:** Map view showing plantation sites (e.g. green circular markers with plant/tree icon) under a project (e.g. MBRDI Biodiversity Conservation - Kolar).
- **Map library:** Confirm whether the app uses Leaflet, OpenLayers, or another library and choose a clustering solution that integrates with it.

---

*This issue can be copied into GitHub/GitLab as a new issue.*
