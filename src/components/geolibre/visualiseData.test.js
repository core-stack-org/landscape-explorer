import {VIEWS, chartRows, finiteNumber, periodObject, sourceFor, toCsv, waterYear} from "./visualiseData";
const view = id => VIEWS.find(v => v.id === id);
test.each([null,undefined,"",false,true,[],{},"NaN",Infinity])("%p stays missing", value => expect(finiteNumber(value)).toBeNull());
test("zero and signs remain meaningful", () => {expect(finiteNumber("-2.4")).toBe(-2.4); expect(finiteNumber(0)).toBe(0);});
test("non-standard JSON numbers do not corrupt text", () => expect(periodObject('{"ET":NaN,"label":"Infinity"}')).toEqual({ET:null,label:"Infinity"}));
test("waterbody seasonal percentages use the combined footprint", () => {
 const rows = chartRows(view("waterbody"), {"area_17-18":4,area_ored:10,"k_17-18":60,"kr_17-18":0});
 expect(rows[0]).toMatchObject({area:4,k:6,kr:0,krz:null});
 expect(rows[1].area).toBeNull();
});
test("cropping shares require all categories and a nonzero denominator", () => {
 const record = {single_kharif_cropped_area_2017:10,single_non_kharif_cropped_area_2017:20,doubly_cropped_area_2017:30,triply_cropped_area_2017:40};
 expect(chartRows(view("crop-shares"),record)[0].doubly_cropped_area).toBe(30);
 delete record.triply_cropped_area_2017;
 expect(chartRows(view("crop-shares"),record)[0].doubly_cropped_area).toBeNull();
});
test("seasonal sums require every interval, preserve zero and align July–June", () => {
 const record = {};
 for(let i=0;i<26;i++) record[new Date(Date.UTC(2017,6,1)+i*14*86400000).toISOString().slice(0,10)] = {Precipitation:2,ET:0,RunOff:1};
 const complete = chartRows(view("seasonal"),record).slice(0,3);
 expect(complete.reduce((sum,row)=>sum+row.Precipitation,0)).toBe(52);
 expect(complete.every(row=>row.ET===0)).toBe(true);
 delete record["2017-07-15"];
 expect(chartRows(view("seasonal"),record)[0].Precipitation).toBeNull();
 expect(waterYear(Date.UTC(2024,5,30))).toBe("2023–2024");
});
test("source resolves configured map data or exact vector summary", () => {
 const scope = {district:"Nalanda",tehsil:"Hilsa"};
 expect(sourceFor(view("annual"),{layers:[{id:"corestack-mws_layers",name:"Annual",source:{url:"https://example.org"}}]},scope).url).toBe("https://example.org");
 expect(decodeURIComponent(sourceFor(view("land-cover"),{},scope).url)).toContain("lulc_vector:lulc_vector_nalanda_hilsa");
});
test("CSV preserves numbers and escapes formula-like strings", () => {expect(toCsv([{name:"=bad",value:-2}])).toContain("'=bad"); expect(toCsv([{value:-2}])).toContain('"-2"');});
