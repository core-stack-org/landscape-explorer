import { buildMWSIndex, evaluateNode } from './dataIndexes';
import { PATTERN_BY_NAME } from './patternsIndex';
import mwsData from './testData/mws_data.json';

// Yahan sirf ye 2 cheezein badalni hain
const PATTERN_NAME = 'high_irrigation_difficulties';
const MWS_ID = '4_13195';

function explain(record, node, depth = 0, lines = []) {
  const pad = '  '.repeat(depth);
  if (!node.children) {
    lines.push(`${pad}${node.key} = ${record[node.key]}  ->  ${evaluateNode(record, node)}`);
    return lines;
  }
  const min = node.minTrue ? ` (min ${node.minTrue})` : '';
  lines.push(`${pad}${node.logic}${min}  ->  ${evaluateNode(record, node)}`);
  node.children.forEach((child) => explain(record, child, depth + 1, lines));
  return lines;
}

test(`signal breakdown: ${PATTERN_NAME} for ${MWS_ID}`, () => {
  const index = buildMWSIndex(mwsData);
  const pattern = PATTERN_BY_NAME.get(PATTERN_NAME);
  const record = index.byId.get(MWS_ID);

  console.log(`\n${PATTERN_NAME} / ${MWS_ID}\n` + explain(record, pattern.root).join('\n'));

  expect(evaluateNode(record, pattern.root)).toBe(true);
});

// ---- naya block yahan se ----
const COUNT_PATTERN = 'high_irrigation_difficulties';
const EXPECTED_IDS = ['4_13195', '4_33287', '4_33503', '4_33762', '4_33944', '4_38807'];

test(`selected MWS count: ${COUNT_PATTERN}`, () => {
  const index = buildMWSIndex(mwsData);
  const pattern = PATTERN_BY_NAME.get(COUNT_PATTERN);

  const selected = [...index.byId.entries()]
    .filter(([, record]) => evaluateNode(record, pattern.root))
    .map(([id]) => id);

  console.log(`\n${COUNT_PATTERN}: ${selected.length} of ${index.byId.size} MWS selected\n` + selected.join(', '));

  expect([...selected].sort()).toEqual([...EXPECTED_IDS].sort());
});



test('selected MWS count for ALL MWS-level patterns', () => {
  const index = buildMWSIndex(mwsData);
  const rows = [];

  for (const [name, pattern] of PATTERN_BY_NAME) {
    if (pattern.level !== 0) continue; // sirf MWS-level
    const selected = [...index.byId.values()].filter((r) => evaluateNode(r, pattern.root));
    rows.push({ pattern: name, selected: selected.length, total: index.byId.size });
  }

  console.table(rows);
  expect(rows.length).toBeGreaterThan(0);
});