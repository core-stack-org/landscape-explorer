import { evaluateNode } from './dataIndexes';

// range node, same shape jo normalizeNode banata hai (type 2 = range)
const rangeNode = {
  key: 'mean_kharif_rabi_ratio',
  type: 2,
  value: { lower: 0, upper: 0.3 },
};

const rec = (v) => ({ mean_kharif_rabi_ratio: v });

describe('evaluateNode - range boundaries', () => {
  test('lower, upper inclusive; outside, sentinel, missing fail', () => {
    expect(evaluateNode(rec(0), rangeNode)).toBe(true);       // lower boundary, 0 is a valid value
    expect(evaluateNode(rec(0.3), rangeNode)).toBe(true);     // upper boundary
    expect(evaluateNode(rec(0.15), rangeNode)).toBe(true);    // inside
    expect(evaluateNode(rec(0.31), rangeNode)).toBe(false);   // just above upper
    expect(evaluateNode(rec(-0.01), rangeNode)).toBe(false);  // just below lower
    expect(evaluateNode(rec(-9999), rangeNode)).toBe(false);  // no-data sentinel
    expect(evaluateNode({}, rangeNode)).toBe(false);          // field missing
  });
});

// ---- naya block yahan se ----
const orNode = {
  logic: 'OR',
  children: [
    { key: 'a', type: 2, value: { lower: 0, upper: 10 } },
    { key: 'b', type: 2, value: { lower: 0, upper: 10 } },
  ],
};

describe('evaluateNode - OR', () => {
  test('true if at least one child is true, false only if both false', () => {
    expect(evaluateNode({ a: 5, b: 50 }, orNode)).toBe(true);       // only first true
    expect(evaluateNode({ a: 50, b: 5 }, orNode)).toBe(true);       // only second true
    expect(evaluateNode({ a: 5, b: 5 }, orNode)).toBe(true);        // both true
    expect(evaluateNode({ a: 50, b: 50 }, orNode)).toBe(false);     // both false
    expect(evaluateNode({ a: -9999, b: 50 }, orNode)).toBe(false);  // sentinel + out of range
  });
});