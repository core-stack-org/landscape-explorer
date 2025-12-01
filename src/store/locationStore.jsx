// src/store/locationStore.js
import { atom } from "recoil";
import { atomFamily } from "recoil";

export const stateDataAtom = atom({
  key: "stateDataAtom",
  default: null,
});

export const stateAtom = atom({
  key: "stateAtom",
  default: null,
});

export const districtAtom = atom({
  key: "districtAtom",
  default: null,
});

export const blockAtom = atom({
  key: "blockAtom",
  default: null,
});

export const filterSelectionsAtom = atom({
  key: "filterSelectionsAtom",
  default: {
    selectedMWSValues: {}, // { filterName: [selectedOptions] }
    selectedVillageValues: {}, // { filterName: [selectedOptions] }
  },
});

export const patternSelectionsAtom = atom({
  key: 'patternSelectionsAtom',
  default: {
    selectedMWSPatterns: {},      // { filterName: [selectedOptions] }
    selectedVillagePatterns: {},  // { filterName: [selectedOptions] }
  },
});


export const yearAtom = atom({
  key: "yearAtom",
  default: null,
});

export const yearAtomFamily = atomFamily({
  key: "yearAtomFamily",
  default: "17_18",
});

export const dataJsonAtom = atom({
  key: "dataJsonAtom",
  default: null,
});

export const waterGeoDataAtom = atom({
  key: "waterGeoDataAtom",
  default: null,
});

export const waterMwsDataAtom = atom({
  key: "waterMwsDataAtom",
  default: null,
});

export const zoiFeaturesAtom = atom({
  key: "zoiFeaturesAtom",
  default: null,
});

export const selectedWaterbodyAtom = atom({
  key: "selectedWaterbodyAtom",
  default: null,
});

export const selectedMwsAtom = atom({
  key: "selectedMwsAtom",
  default: null,
});

export const selectedZoiAtom = atom({
  key: "selectedZoiAtom",
  default: null,
});

export const selectedWaterbodyForTehsilAtom = atom({
  key: "selectedWaterbodyForTehsil",
  default: null,
});





