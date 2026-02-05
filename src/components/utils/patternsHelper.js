import PatternsData from '../data/Patterns.json';

export const getAllPatternTypes = () => {
    return Object.keys(PatternsData);
};

export const getSubcategoriesForCategory = (mainCategory) => {
    const subcategories = [];
    
    if (PatternsData[mainCategory]) {
        PatternsData[mainCategory].forEach(subcategoryGroup => {
            Object.keys(subcategoryGroup).forEach(subcategory => {
                subcategories.push(subcategory);
            });
        });
    }
    
    return subcategories;
};

export const getPatternsForSubcategory = (mainCategory, subcategory) => {
    const patterns = [];
    
    if (PatternsData[mainCategory]) {
        PatternsData[mainCategory].forEach(subcategoryGroup => {
            if (subcategoryGroup[subcategory]) {
                subcategoryGroup[subcategory].forEach(pattern => {
                    patterns.push({
                        category: mainCategory,
                        subcategory: subcategory,
                        name: pattern.Name,
                        patternCategory: pattern.Category,
                        characteristics: pattern.Characteristics,
                        level: pattern.level,
                        values: pattern.Values
                    });
                });
            }
        });
    }
    
    return patterns;
};

export const getAllPatterns = () => {
    const patterns = [];
    
    Object.keys(PatternsData).forEach(mainCategory => {
        PatternsData[mainCategory].forEach(subcategoryGroup => {
            Object.keys(subcategoryGroup).forEach(subcategory => {
                subcategoryGroup[subcategory].forEach(pattern => {
                    patterns.push({
                        category: mainCategory,
                        subcategory: subcategory,
                        name: pattern.Name,
                        patternCategory: pattern.Category,
                        characteristics: pattern.Characteristics,
                        level: pattern.level,
                        values: pattern.Values
                    });
                });
            });
        });
    });
    
    return patterns;
};


export const getPatternsByCategory = (category) => {
    const allPatterns = getAllPatterns();
    return allPatterns.filter(pattern => pattern.category === category);
};

export const getPatternsByLevel = () => {
    const allPatterns = getAllPatterns();
    return {
        MWS: allPatterns.filter(p => p.level === 0),
        Village: allPatterns.filter(p => p.level === 1)
    };
};
