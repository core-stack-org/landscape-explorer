export const handlePatternSelection = (pattern, isSelected, patternSelections, setPatternSelections) => {
    const { name, level, category, subcategory, patternCategory, characteristics, values } = pattern;
    
    // Determine which level to update (MWS or Village)
    const levelKey = level === 0 ? 'selectedMWSPatterns' : 'selectedVillagePatterns';
    
    // Create a copy of current selections
    const updatedSelections = { ...patternSelections };
    
    if (isSelected) {
        // Add the pattern to selections
        updatedSelections[levelKey] = {
            ...updatedSelections[levelKey],
            [name]: {
                category,
                subcategory,
                patternCategory,
                characteristics,
                level,
                values,
                // Store for easy access
                conditions: values.map(v => ({
                    label: v.label,
                    key: v.Key,
                    type: v.type,
                    value: v.value
                }))
            }
        };
    } else {
        // Remove the pattern from selections
        const newLevelSelections = { ...updatedSelections[levelKey] };
        delete newLevelSelections[name];
        updatedSelections[levelKey] = newLevelSelections;
    }
    
    // Update the state
    setPatternSelections(updatedSelections);
    
    return updatedSelections;
};


export const isPatternSelected = (patternName, patternSelections) => {
    return !!(
        patternSelections.selectedMWSPatterns[patternName] ||
        patternSelections.selectedVillagePatterns[patternName]
    );
};


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