import { useTranslation } from "react-i18next";
import { useMemo } from "react";

// i18next uses '.' as separator, so keys with spaces like "Andhra Pradesh"
// must be looked up with the separator disabled or via direct object access.
// We use the defaultValue fallback: t(key, { defaultValue: original })
// and disable key separator for location lookups by using the raw resource.

function translateLabel(i18n, namespace, label) {
  const lang = i18n.language;
  const resources = i18n.getResourceBundle(lang, "translation");
  if (resources && resources[namespace] && resources[namespace][label]) {
    return resources[namespace][label];
  }
  // fallback to English
  const enResources = i18n.getResourceBundle("en", "translation");
  if (enResources && enResources[namespace] && enResources[namespace][label]) {
    return enResources[namespace][label];
  }
  return label;
}

export function useTranslatedLocations(statesData) {
  const { i18n } = useTranslation();
  const language = i18n.language;

  return useMemo(() => {
    if (!statesData) return statesData;

    return statesData.map((state) => ({
      ...state,
      label: translateLabel(i18n, "states", state.label),
      district: state.district?.map((d) => ({
        ...d,
        label: translateLabel(i18n, "districts", d.label),
        blocks: d.blocks?.map((b) => ({
          ...b,
          label: translateLabel(i18n, "blocks", b.label),
        })),
      })),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statesData, language]);
}
