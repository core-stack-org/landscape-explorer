// Layers are owned by the components that create them (dashboard: MWS and
// waterbody; sidebar: farm, plan, steward). Each owner registers a getter so
// the click collector can read the current layer without moving ownership.
const getters = {};

export const layerRegistry = {
  register(type, getter) {
    getters[type] = getter;
    return () => {
      if (getters[type] === getter) delete getters[type];
    };
  },
  get(type) {
    return getters[type]?.() ?? null;
  },
};
