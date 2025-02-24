import { Fill, Stroke, Style} from "ol/style.js";

const layerStyles = (feature, vectorStyle, idx = 0, villageJson, dataJson) => {
    
    let yearsSetArr = ["2017_2018", "2018_2019", "2019_2020", "2020_2021", "2021_2022", "2022_2023"];
    let years = ["2017","2018","2019","2020","2021","2022"]
    let tempIdx = 0;
    let avg_Res = 0;
    
    switch (idx) {
        case 0:
            return new Style({
                stroke: new Stroke({
                    color: vectorStyle[0].stroke !== undefined ? vectorStyle[0].stroke : "#006400",
                    width: 1.0,
                }),
                fill: new Fill({
                    color: vectorStyle[0].fill !== undefined ? vectorStyle[0].fill : "rgba(144, 238, 144, 0.3)",
                })
            })
        case 1:
            // For the AVG_PRECIPITATION
            let total_precp = 0;
            yearsSetArr.map((item) => {
                total_precp += JSON.parse(feature.values_[item]).Precipitation;
            })
            avg_Res = total_precp / yearsSetArr.length;
            break;

        case 2:
            // For AVG_DRYSPELL
            let total_Drysp = 0;
            years.map((item) => {
                total_Drysp += feature.values_["drysp_"+item];
            })
            avg_Res = total_Drysp / years.length;
            break;

        case 3:
            // AVG RUNOFF
            let total_runoff = 0;
            yearsSetArr.map((item) => {
                total_runoff += JSON.parse(feature.values_[item]).RunOff;
            })
            avg_Res = total_runoff / yearsSetArr.length;
            break;
        
        case 4:
            // DROUGHT YEARS
            years.map((item) => {
                let tempDro = (feature.values_["drlb_"+item].match(/2/g) || []).length + (feature.values_["drlb_"+item].match(/3/g)||[]).length;
                if(tempDro > 5){avg_Res++;}
            })
            break;

        case 5:
            // TOTAL POPULATION in village
            avg_Res = feature.values_.TOT_P
            break;
        
        case 6:
            // PERCENT ST POPULATION
            if(feature.values_.P_ST !== 0)
                avg_Res = (feature.values_.P_ST/ feature.values_.TOT_P) * 100;
            break;
        
        case 7:
            // PERCENT SC POPULATION
            if(feature.values_.P_SC !== 0)
                avg_Res = (feature.values_.P_SC / feature.values_.TOT_P) * 100;
            break;

        case 8:
            // PERCENT SC POPULATION
            if(feature.values_.P_LIT !== 0)
                avg_Res = (feature.values_.P_LIT / feature.values_.TOT_P) * 100;
            break;

        case 9:
            for(let i = 0 ; i < villageJson.length; ++i){
                if(villageJson[i].village_id === feature.values_.vill_ID){
                    avg_Res = villageJson[i].total_assets;
                    break;
                }
            }
            break;
        
        case 10:
            for(let i = 0 ; i < dataJson.length; ++i){
                if(dataJson[i].mws_id === feature.values_.uid){
                    avg_Res = dataJson[i].trend_g;
                    break;
                }
            }
            break;
    }
    
    for(tempIdx = 0; tempIdx < vectorStyle.length; ++tempIdx){
        if(avg_Res >= vectorStyle[tempIdx].lower && avg_Res <= vectorStyle[tempIdx].upper){
            break;
        }
    }
    return new Style({
        stroke: new Stroke({
            color: vectorStyle[tempIdx].stroke !== undefined ? vectorStyle[tempIdx].stroke : "#006400",
            width: 1.0,
        }),
        fill: new Fill({
            color: vectorStyle[tempIdx].fill !== undefined ? vectorStyle[tempIdx].fill : "rgba(144, 238, 144, 0.3)",
        })
    })
}

export default layerStyles;