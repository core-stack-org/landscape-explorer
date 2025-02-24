// src/store/locationStore.js
import { atom } from 'recoil';

export const stateDataAtom = atom({
  key: 'stateDataAtom',
  default: null,
});

export const stateAtom = atom({
  key: 'stateAtom',
  default: null,
});

export const districtAtom = atom({
  key: 'districtAtom',
  default: null,
});

export const blockAtom = atom({
  key: 'blockAtom', 
  default: null,
});

export const filterSelectionsAtom = atom({
  key: 'filterSelectionsAtom',
  default: {
    selectedMWSValues: {},      // { filterName: [selectedOptions] }
    selectedVillageValues: {},  // { filterName: [selectedOptions] }
  },
});

export const yearAtom = atom({
  key: 'yearAtom', 
  default: null,
});