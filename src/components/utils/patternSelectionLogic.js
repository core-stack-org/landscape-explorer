// Patterns from patternsIndex.js already carry `conditions` — no need to
// recompute them here.
export function selectPattern(pattern, isSelected, patternSelections) {
  const levelKey = pattern.level === 0 ? 'selectedMWSPatterns' : 'selectedVillagePatterns';
  const updated = { ...patternSelections[levelKey] };

  if (isSelected) updated[pattern.name] = pattern;
  else delete updated[pattern.name];

  return { ...patternSelections, [levelKey]: updated };
}

export function isPatternSelected(patternName, patternSelections) {
  return Boolean(
    patternSelections.selectedMWSPatterns[patternName] ||
    patternSelections.selectedVillagePatterns[patternName]
  );
}


export const getAllSelectedPatterns = (patternSelections) => {
    const mwsPatterns = Object.values(patternSelections.selectedMWSPatterns || {});
    const villagePatterns = Object.values(patternSelections.selectedVillagePatterns || {});
    return [...mwsPatterns, ...villagePatterns];
};


export const getSelectedPatternsByLevel = (level, patternSelections) => {
    const levelKey = level === 0 ? 'selectedMWSPatterns' : 'selectedVillagePatterns';
    return Object.values(patternSelections[levelKey] || {});
};


export const clearAllPatterns = (setPatternSelections) => {
    setPatternSelections({
        selectedMWSPatterns: {},
        selectedVillagePatterns: {}
    });
};


export const clearPatternsByLevel = (level, patternSelections, setPatternSelections) => {
    const levelKey = level === 0 ? 'selectedMWSPatterns' : 'selectedVillagePatterns';
    setPatternSelections({
        ...patternSelections,
        [levelKey]: {}
    });
};