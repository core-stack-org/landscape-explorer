# Waterbody Dashboard - Improvement Plan

## Executive Summary

The waterbody dashboard is a feature-rich application with multiple map views, charts, and data tables. However, it has accumulated significant technical debt that impacts maintainability, performance, and developer experience. This document outlines actionable improvements.

---

## 1. UX Improvements

### 1.1 Loading States & Feedback

**Current Issue**: Incomplete loading states, users see blank screens during data fetches.

**Recommendations**:
- Add skeleton loaders for the data table while `geoData` loads
- Add shimmer placeholders for charts
- Show progress indicators when switching between waterbodies
- Add toast notifications for API errors instead of silent failures

### 1.2 Empty States

**Current Issue**: Generic or missing empty states when no data is available.

**Recommendations**:
- Design meaningful empty states for charts (e.g., "No NDVI data available for this waterbody")
- Add contextual help when no projects are found for an organization

### 1.3 Map Interactions

**Current Issue**: Multiple maps with inconsistent zoom controls, no fullscreen option.

**Recommendations**:
- Add fullscreen toggle for maps
- Sync zoom levels across related maps when comparing
- Add a "Reset View" button to return to default extent
- Show coordinates on hover for power users
- Add a minimap/overview for context

### 1.4 Table UX

**Current Issue**: Basic table with limited features.

**Recommendations**:
- Add pagination for large datasets
- Implement column resizing
- Add column visibility toggles
- Sticky header during scroll
- Export to CSV/Excel functionality
- Row virtualization for performance

### 1.5 Chart Interactions

**Current Issue**: Charts have basic interactivity.

**Recommendations**:
- Add "Download Chart" button (as PNG/SVG)
- Add data point tooltips with more context
- Enable zoom/pan for time-series charts (NDVI, Drought)
- Add legend click-to-hide functionality

### 1.6 Responsive Design

**Current Issue**: Some layouts break on smaller screens.

**Recommendations**:
- Collapse sidebar charts into tabs on mobile
- Stack map + charts vertically on tablets
- Use responsive font sizes (clamp is used but inconsistently)
- Make filter dropdowns mobile-friendly

### 1.7 Accessibility

**Current Issue**: Missing accessibility features.

**Recommendations**:
- Add proper ARIA labels to interactive elements
- Ensure keyboard navigation for all controls
- Add focus indicators for interactive elements
- Ensure color contrast meets WCAG standards
- Add screen reader announcements for dynamic content

---

## 2. Code Improvements

### 2.1 Component Decomposition

**Critical Issue**: `water_project_dashboard.jsx` is **3152 lines** - this is unmaintainable.

**Recommended Split**:

```
components/
  waterbody/
    WaterbodyTable.jsx          (~300 lines) - Table component with filtering/sorting
    WaterbodyMapView.jsx        (~200 lines) - Container for the 3 map views
    WaterbodyDetailPanel.jsx    (~150 lines) - Selected waterbody info panel
    WaterbodyCharts.jsx         (~200 lines) - Charts container
    WaterbodyFilters.jsx        (~100 lines) - Filter UI components
    WaterbodyLegend.jsx         (~80 lines)  - Reusable legend component
    
    maps/
      LULCMap.jsx               (~150 lines) - Map 1: LULC view
      ZOIMap.jsx                (~150 lines) - Map 2: Zone of Influence
      TerrainMap.jsx            (~150 lines) - Map 3: Terrain & Drainage
      MapControls.jsx           (~50 lines)  - Zoom controls component
      
    hooks/
      useWaterRejData.js        (~80 lines)  - Already exists, keep as-is
      useMapInitialization.js   (~100 lines) - Extract map init logic
      useWaterbodyCalculations.js (~150 lines) - Extract data processing
```

### 2.2 Extract Utility Functions

**Current Issue**: Business logic mixed with components.

**Recommendations**:

```javascript
// utils/waterbodyCalculations.js
export const extractSeasonYears = (props) => { ... }
export const getFirstNonZeroYearIndex = (props) => { ... }
export const getPrePostYears = (props, interventionYear) => { ... }
export const computeTotalSeasonAverages = (props) => { ... }
export const computeAvgSeason = (props, preYears, postYears, prefix) => { ... }
export const computeImpact = (before, after) => { ... }
export const getImpactColor = (impact) => { ... }
export const computeImpactedAreaRabi = (areaOred, impactRabi) => { ... }
export const computeImpactedAreaZaid = (areaOred, impactZaid) => { ... }
export const getCoordinatesFromGeometry = (geometry) => { ... }
```

### 2.3 API Layer

**Current Issue**: API calls scattered throughout components, token management duplicated.

**Recommendations**:

```javascript
// services/api.js
class ApiClient {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL;
    this.geoserverUrl = 'https://geoserver.core-stack.org:8443/geoserver';
  }

  async getAccessToken() {
    let token = sessionStorage.getItem('accessToken');
    if (!token) {
      token = await this.login();
    }
    return token;
  }

  async login() { ... }
  
  async fetchProjects(organizationId) { ... }
  
  async fetchOrganizations() { ... }
  
  async fetchWFSLayer(workspace, typeName) { ... }
}

export const apiClient = new ApiClient();
```

### 2.4 State Management

**Current Issue**: 30+ useState calls in single component, prop drilling, sessionStorage scattered.

**Recommendations**:

Option A: Use `useReducer` for related state:
```javascript
const [waterbodyState, dispatch] = useReducer(waterbodyReducer, {
  selectedWaterbody: null,
  mapClickedWaterbody: null,
  selectedFeature: null,
  filters: { state: [], district: [], block: [], village: [] },
  sortField: null,
  sortOrder: 'asc',
});
```

Option B: Create Context for shared state:
```javascript
// context/WaterbodyContext.jsx
export const WaterbodyProvider = ({ children }) => {
  // Consolidate all waterbody-related state here
};
```

### 2.5 Performance Optimizations

**Current Issues**:
- Large component re-renders on any state change
- Missing memoization
- Map layers recreated unnecessarily

**Recommendations**:
```javascript
// Memoize expensive calculations
const sortedRows = useMemo(() => {
  return [...filteredRows].sort((a, b) => { ... });
}, [filteredRows, sortField, sortOrder]);

// Memoize child components
const MemoizedChart = React.memo(WaterAvailabilityChart);

// Use useCallback for handlers passed to children
const handleSort = useCallback((field) => {
  setSortField(prev => prev === field ? prev : field);
  setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
}, []);
```

### 2.6 Error Handling

**Current Issue**: Silent failures, console.error only.

**Recommendations**:
```javascript
// Add error boundaries
<ErrorBoundary fallback={<ChartErrorFallback />}>
  <WaterAvailabilityChart ... />
</ErrorBoundary>

// Add error state to data fetching
const { geoData, mwsGeoData, zoiFeatures, loading, error } = useWaterRejData(...);

if (error) {
  return <ErrorMessage message={error.message} retry={refetch} />;
}
```

---

## 3. React Best Practices to Apply

### 3.1 Remove Side Effects from Render

**Current Issue** (WaterUsedChart.jsx):
```javascript
export default function WaterAvailabilityGraph({ waterbody, water_rej }) {
  console.log(water_rej);  // ❌ Side effect in render
  console.log(waterbody);  // ❌ Side effect in render
```

**Fix**: Remove console.logs or wrap in useEffect for debugging.

### 3.2 Fix Missing Hook Dependencies

**Current Issue** (water_headerSection.jsx):
```javascript
useEffect(() => {
  fetchOrganizations();
}, []);  // ❌ Missing dependencies
```

**Fix**: Add proper dependencies or use useCallback:
```javascript
useEffect(() => {
  fetchOrganizations();
}, [fetchOrganizations]);
```

### 3.3 Use Proper JSX Attributes

**Current Issue**: Using `class` instead of `className`:
```javascript
<div class="h-screen overflow-hidden bg-[#EAEAEA]">  // ❌ Should be className
```

**Fix**: Replace all `class` with `className`.

### 3.4 Avoid Index as Key for Dynamic Lists

**Current Issue**:
```javascript
{rows.map((row, index) => (
  <tr key={index}>  // ❌ Using index as key
```

**Fix**: Use unique identifiers:
```javascript
{rows.map((row) => (
  <tr key={row.UID}>  // ✅ Using unique ID
```

### 3.5 Controlled vs Uncontrolled Inputs

Ensure all form inputs are consistently controlled with proper state management.

### 3.6 Avoid Anonymous Functions in JSX

**Current Issue**:
```javascript
onClick={() => {
  const view = mapRef2.current?.getView();
  view?.animate({ zoom: view.getZoom() + 1, duration: 300 });
}}
```

**Fix**: Extract to named handlers:
```javascript
const handleZoomIn = useCallback((mapRef) => {
  const view = mapRef.current?.getView();
  view?.animate({ zoom: view.getZoom() + 1, duration: 300 });
}, []);
```

### 3.7 Prop Types or TypeScript

Add runtime prop validation:
```javascript
WaterAvailabilityChart.propTypes = {
  waterbody: PropTypes.shape({
    UID: PropTypes.string.isRequired,
    waterbody: PropTypes.string,
  }).isRequired,
  water_rej_data: PropTypes.shape({
    features: PropTypes.array.isRequired,
  }).isRequired,
  mwsFeature: PropTypes.object,
  onImpactYearChange: PropTypes.func,
};
```

---

## 4. DRY Improvements

### 4.1 Consolidate Year Constants

**Current Issue**: Years defined in 6+ places:
- `WaterAvailabilityChart.jsx` (line 28)
- `WaterUsedChart.jsx` (line 15)
- `CroppingIntensityStackChart.jsx` (line 251)
- `yearSlider.jsx` (line 7)
- `water_project_dashboard.jsx` (multiple places)

**Fix**: Create single source of truth:
```javascript
// constants/years.js
export const YEAR_LABELS = ["17-18", "18-19", "19-20", "20-21", "21-22", "22-23", "23-24", "24-25"];
export const YEAR_SUFFIXES = ["2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"];
export const INTERVENTION_YEAR = "22-23";

export const YEAR_MAP = {
  "17-18": "2017-2018",
  "18-19": "2018-2019",
  // ...
};

export const YEAR_SLIDER_DATA = YEAR_LABELS.map((label, i) => ({
  label: `20${label.split('-')[0]}-20${label.split('-')[1]}`,
  value: label.replace('-', '_'),
}));
```

### 4.2 Create Reusable Chart Configuration

**Current Issue**: ChartJS registration duplicated in every chart file.

**Fix**:
```javascript
// utils/chartConfig.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

// Register once
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
);

export const defaultChartOptions = {
  maintainAspectRatio: false,
  responsive: true,
  plugins: {
    legend: { position: 'top' },
  },
};

export const createInterventionAnnotation = (year = INTERVENTION_YEAR) => ({
  type: 'line',
  scaleID: 'x',
  value: year,
  borderColor: 'black',
  borderWidth: 2,
  label: {
    content: 'Intervention Year',
    enabled: true,
    position: 'start',
  },
});
```

### 4.3 Create Reusable Map Legend Component

**Current Issue**: Similar legend rendering in 3+ places.

**Fix**:
```javascript
// components/common/MapLegend.jsx
const MapLegend = ({ 
  title, 
  items, 
  isOpen, 
  onToggle,
  position = 'bottom-left' 
}) => {
  if (!isOpen) {
    return (
      <div
        onClick={onToggle}
        className="bg-white/90 px-1.5 py-1.5 rounded-r-md shadow-md cursor-pointer font-bold text-[13px]"
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
      >
        {title} ▶
      </div>
    );
  }

  return (
    <div className="bg-white/90 p-4 rounded-md shadow-md min-w-[220px]">
      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold">{title}</p>
        <button onClick={onToggle}>◀</button>
      </div>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 mt-2">
          <div
            className="w-5 h-5 border border-black opacity-70"
            style={{ backgroundColor: item.color }}
          />
          <p className="text-sm">{item.label}</p>
        </div>
      ))}
    </div>
  );
};
```

### 4.4 Create Reusable Map Zoom Controls

**Current Issue**: Identical zoom controls repeated for 3 maps.

**Fix**:
```javascript
// components/common/MapZoomControls.jsx
const MapZoomControls = ({ mapRef }) => {
  const handleZoom = (delta) => {
    const view = mapRef.current?.getView();
    view?.animate({ zoom: view.getZoom() + delta, duration: 300 });
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        className="bg-white border border-gray-300 rounded-md w-10 h-10 text-xl"
        onClick={() => handleZoom(1)}
      >
        +
      </button>
      <button
        className="bg-white border border-gray-300 rounded-md w-10 h-10 text-xl"
        onClick={() => handleZoom(-1)}
      >
        –
      </button>
    </div>
  );
};
```

### 4.5 Create Reusable Map Initialization Hook

**Current Issue**: Similar map init code for 3 maps.

**Fix**:
```javascript
// hooks/useMapInstance.js
const useMapInstance = (elementRef, options = {}) => {
  const mapRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return;

    const baseLayer = new TileLayer({
      source: new XYZ({
        url: options.baseUrl || 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        maxZoom: 35,
      }),
    });

    mapRef.current = new Map({
      target: elementRef.current,
      layers: [baseLayer],
      view: new View({
        center: options.center || [0, 0],
        zoom: options.zoom || 10,
        projection: options.projection || 'EPSG:4326',
      }),
      controls: defaultControls({ zoom: false }),
    });

    // Disable default interactions based on options
    if (!options.mouseWheelZoom) {
      mapRef.current.getInteractions().forEach(i => {
        if (i instanceof MouseWheelZoom) mapRef.current.removeInteraction(i);
      });
    }

    setIsInitialized(true);

    return () => {
      mapRef.current?.setTarget(null);
      mapRef.current = null;
    };
  }, [elementRef.current]);

  return { mapRef, isInitialized };
};
```

### 4.6 Consolidate Color Constants

**Current Issue**: Colors hardcoded in multiple places.

**Fix**:
```javascript
// constants/colors.js
export const WATER_COLORS = {
  kharif: '#74CCF4',
  rabi: '#1ca3ec',
  zaid: '#0f5e9c',
};

export const CROP_COLORS = {
  crops: '#BAD93E',
  tree: '#38761d',
  shrubs: '#eaa4f0',
  barren: '#A9A9A9',
  builtup: '#ff0000',
};

export const CROPPING_INTENSITY_COLORS = {
  triple: '#b3561d',
  double: '#FF9371',
  singleNonKharif: '#f59d22',
  singleKharif: '#BAD93E',
};

export const DROUGHT_COLORS = {
  moderate: '#EB984E',
  severe: '#E74C3C',
  drySpell: '#8884d8',
};

export const TERRAIN_LEGEND = [
  { color: '#313695', label: 'V-shape river valleys' },
  { color: '#4575b4', label: 'Midslope incised drainages' },
  // ... rest of legend
];

export const DRAINAGE_LEGEND = [
  { color: '#03045E', label: '1' },
  { color: '#023E8A', label: '2' },
  // ... rest of legend
];
```

### 4.7 Create Stat Card Component

**Current Issue**: Similar card rendering for stats.

**Fix**:
```javascript
// components/common/StatCard.jsx
const StatCard = ({ label, value, className }) => (
  <div className={`
    flex-1 bg-gradient-to-br from-gray-50 to-gray-100 
    p-4 md:p-6 rounded-xl border border-gray-200 
    shadow-sm flex flex-col items-center text-center 
    min-h-[120px] transition-all duration-300 
    hover:-translate-y-0.5 hover:shadow-md
    ${className}
  `}>
    <p className="uppercase tracking-wide font-bold text-sm text-gray-800">
      {label}
    </p>
    <p className="mt-1 text-xl md:text-2xl font-semibold text-blue-600">
      {value}
    </p>
  </div>
);
```

---

## 5. Priority Matrix

| Priority | Task | Impact | Effort |
|----------|------|--------|--------|
| 🔴 High | Split water_project_dashboard.jsx | High | High |
| 🔴 High | Extract utility functions | High | Medium |
| 🔴 High | Create reusable map hooks | High | Medium |
| 🟡 Medium | Consolidate year constants | Medium | Low |
| 🟡 Medium | Create chart config module | Medium | Low |
| 🟡 Medium | Add proper error handling | Medium | Medium |
| 🟡 Medium | Fix class vs className | Medium | Low |
| 🟢 Low | Add prop types | Low | Medium |
| 🟢 Low | Improve loading states | Medium | Low |
| 🟢 Low | Add accessibility | Medium | High |

---

## 6. Suggested Implementation Order

1. **Week 1**: Create constants files (years, colors), fix immediate issues (class → className)
2. **Week 2**: Extract utility functions to `/utils`, create API service layer
3. **Week 3**: Split `water_project_dashboard.jsx` into smaller components
4. **Week 4**: Create reusable components (MapLegend, ZoomControls, StatCard)
5. **Week 5**: Add custom hooks for map initialization
6. **Week 6**: Improve error handling and loading states
7. **Week 7**: Add prop types/TypeScript, accessibility improvements

