import {
  isValid,
  parseFlexibleDate,
  agriMonthIndex,
  fracPosition,
  getConfidenceLevel,
  buildCroppingHistory,
  monthlyPointsByYear,
  countDryMonths,
  waterBalanceSummary,
} from './farmDetailsUtils';

describe('isValid', () => {
  it('rejects null, undefined, non-numbers and sentinel values', () => {
    expect(isValid(null)).toBe(false);
    expect(isValid(undefined)).toBe(false);
    expect(isValid('abc')).toBe(false);
    expect(isValid(-1)).toBe(false);
    expect(isValid(-9999)).toBe(false);
  });
  it('accepts zero and positive values', () => {
    expect(isValid(0)).toBe(true);
    expect(isValid(0.42)).toBe(true);
  });
});

describe('parseFlexibleDate', () => {
  it('reads dd/mm/yyyy with day first', () => {
    const d = parseFlexibleDate('02/06/2023');
    expect(d.getDate()).toBe(2);
    expect(d.getMonth()).toBe(5);
    expect(d.getFullYear()).toBe(2023);
  });
  it('reads ISO monthly dates', () => {
    expect(parseFlexibleDate('2024-01-01T00:00:00').getMonth()).toBe(0);
  });
  it('returns null for empty input', () => {
    expect(parseFlexibleDate(null)).toBeNull();
    expect(parseFlexibleDate('')).toBeNull();
  });
});

describe('agri-year boundaries (July = 0, June = 11)', () => {
  it('maps July to 0 and June to 11', () => {
    expect(agriMonthIndex(new Date(2023, 6, 1))).toBe(0);
    expect(agriMonthIndex(new Date(2024, 5, 30))).toBe(11);
  });
  it('places 1 July at 0 and 1 June at 11', () => {
    expect(fracPosition(new Date(2023, 6, 1))).toBe(0);
    expect(fracPosition(new Date(2024, 5, 1))).toBe(11);
  });
});

describe('getConfidenceLevel', () => {
  it('uses strict greater-than for High', () => {
    expect(getConfidenceLevel(0.7)).toBe('Medium');
    expect(getConfidenceLevel(0.71)).toBe('High');
  });
  it('returns null for missing confidence', () => {
    expect(getConfidenceLevel(null)).toBeNull();
  });
});

describe('buildCroppingHistory', () => {
  it('leaves a row with no crop as a gap', () => {
    const [row] = buildCroppingHistory([{ year: 2023, crop1: null, cropStartDate: null, cropEndDate: null }]);
    expect(row.crop).toBeNull();
    expect(row.startFrac).toBeNull();
  });
  it('treats an empty crop string as no crop', () => {
    const [row] = buildCroppingHistory([{ year: 2023, crop1: '  ', cropStartDate: '01/08/2023', cropEndDate: '01/12/2023' }]);
    expect(row.crop).toBeNull();
  });
  it('spans a cycle across the calendar-year boundary', () => {
    const [row] = buildCroppingHistory([{ year: 2023, crop1: 'Wheat', conf1: 0.9, cropStartDate: '15/11/2023', cropEndDate: '10/03/2024' }]);
    expect(row.startFrac).toBeGreaterThan(4);
    expect(row.endFrac).toBeGreaterThan(row.startFrac);
    expect(row.endFrac).toBeLessThan(12);
  });
  it('gives no bar when harvest precedes sowing', () => {
    const [row] = buildCroppingHistory([{ year: 2023, crop1: 'Rice', cropStartDate: '10/12/2023', cropEndDate: '01/09/2023' }]);
    expect(row.startFrac).toBeNull();
  });
  it('flags a sowing that happened before the year window', () => {
    const [row] = buildCroppingHistory([{ year: 2023, crop1: 'Rice', cropStartDate: '28/06/2023', cropEndDate: '28/12/2023' }]);
    expect(row.sowBeforeWindow).toBe(true);
  });
});

describe('monthlyPointsByYear and countDryMonths', () => {
  const monthly = [
    { year: 2023, date: '2023-07-01T00:00:00', aet: 2, pet: 6, mai: 0.3 },
    { year: 2023, date: '2023-08-01T00:00:00', aet: -9999, pet: 5, mai: -9999 },
    { year: 2023, date: '2023-09-01T00:00:00', aet: 3, pet: 4, mai: 0.8 },
  ];

  it('keeps a missing month as null, never zero', () => {
    const [year] = monthlyPointsByYear(monthly);
    expect(year.points[1].mai).toBeNull();
    expect(year.points[1].aet).toBeNull();
  });
  it('excludes sentinel months from the dry count and reports validMonths', () => {
    const [year] = countDryMonths(monthly);
    expect(year.validMonths).toBe(2);
    expect(year.count).toBe(1);
    expect(year.dryMonths).toEqual(['Jul']);
  });
  it('reports null count when a year has no valid MAI at all', () => {
    const [year] = countDryMonths([{ year: 2024, date: '2024-07-01', aet: null, pet: null, mai: -9999 }]);
    expect(year.count).toBeNull();
    expect(year.validMonths).toBe(0);
  });
});

describe('waterBalanceSummary', () => {
  it('computes share used and shortfall from the sample record', () => {
    const s = waterBalanceSummary({ aetAnnual: 671.0869, petAnnual: 2152.8652, maiAnnual: 0.3709 });
    expect(s.percentUsed).toBe(31);
    expect(s.shortfall).toBe(1482);
  });
  it('returns null percentages when PET is missing', () => {
    expect(waterBalanceSummary({ aetAnnual: 100, petAnnual: null }).percentUsed).toBeNull();
  });
});
