export const YEARS = [
    "17-18", "18-19", "19-20", "20-21",
    "21-22", "22-23", "23-24"
  ];
  
  export const YEAR_MAP = {
    "17-18": "2017-2018",
    "18-19": "2018-2019",
    "19-20": "2019-2020",
    "20-21": "2020-2021",
    "21-22": "2021-2022",
    "22-23": "2022-2023",
    "23-24": "2023-2024",
  };
  
  //  rainfall extraction (PROJECT MODE)
  export const getRainfallByYear = (mwsFeature) => {
    const rainfall = {};
  
    YEARS.forEach((y) => {
      const long = YEAR_MAP[y];
  
      rainfall[y] =
        Number(mwsFeature?.properties?.[`precipitation_kharif_${long}`] || 0) +
        Number(mwsFeature?.properties?.[`precipitation_rabi_${long}`] || 0) +
        Number(mwsFeature?.properties?.[`precipitation_zaid_${long}`] || 0);
    });
  
    return rainfall;
  };
  
  //  impact year finder
  export const calculateImpactYear = (rainfall) => {
    const interventionYear = "22-23";
  
    const preYears = YEARS.filter(y => y < interventionYear);
    const postYears = YEARS.filter(y => y > interventionYear);
  
    let minDiff = Infinity;
    let result = null;
  
    preYears.forEach(pre => {
      postYears.forEach(post => {
        const diff = Math.abs(
          (rainfall[pre] ?? 0) - (rainfall[post] ?? 0)
        );
  
        if (diff < minDiff) {
          minDiff = diff;
          result = { pre, post, diff };
        }
      });
    });
  
    return result;
  };
  