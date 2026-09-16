import { finiteMeasurement } from "./geolibreStyleUtils";

export const FORTNIGHT_VALUE_FIELD = "__corestack_delta_g_mm";
export const FORTNIGHT_DATE_FIELD = "__corestack_observation_date";
const isDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const measurement = value => {
  try {
    const record = typeof value === "string" ? JSON.parse(value) : value;
    return finiteMeasurement(record?.DeltaG);
  } catch { return null; }
};

/** Materialize one shared observation date; never silently mix latest dates
 * from different MWSs. Original date-keyed properties and geometry are retained.
 * MapLibre expressions cannot parse JSON strings, so parsing happens on ingest.
 */
export const prepareFortnightData = (data, requestedDate) => {
  const dates = [...new Set((data?.features || []).flatMap(feature => Object.keys(feature.properties || {}).filter(isDate)))].sort();
  const date = dates.includes(requestedDate) ? requestedDate : dates.at(-1) || null;
  return {
    dates, date,
    data: { ...data, features: (data?.features || []).map(feature => ({
      ...feature,
      properties: {
        ...feature.properties,
        [FORTNIGHT_DATE_FIELD]: date,
        [FORTNIGHT_VALUE_FIELD]: date ? measurement(feature.properties?.[date]) : null,
      },
    })) },
  };
};
