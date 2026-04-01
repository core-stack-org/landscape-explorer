import { useMemo } from "react";
import Select from "react-select";
import { useTranslation } from "react-i18next";

const SelectButton = ({
  stateData,
  handleItemSelect,
  setState,
  currVal,
  label,
  placeholder,
  translateNamespace,
}) => {
  const { i18n } = useTranslation();
  const language = i18n.language;

  const getTranslatedLabel = useMemo(() => {
    if (!translateNamespace) {
      return (option) => option?.label ?? "";
    }

    return (option) => {
      const rawLabel = String(option?.label ?? "");
      const resources = i18n.getResourceBundle(language, "translation");
      if (
        resources &&
        resources[translateNamespace] &&
        resources[translateNamespace][rawLabel]
      ) {
        return resources[translateNamespace][rawLabel];
      }

      const enResources = i18n.getResourceBundle("en", "translation");
      if (
        enResources &&
        enResources[translateNamespace] &&
        enResources[translateNamespace][rawLabel]
      ) {
        return enResources[translateNamespace][rawLabel];
      }

      return rawLabel;
    };
  }, [i18n, language, translateNamespace]);

  const getOptionValue = useMemo(() => {
    return (option) =>
      String(
        option?.value ??
          option?.block_id ??
          option?.tehsil_id ??
          option?.district_id ??
          option?.state_id ??
          option?.id ??
          option?.label ??
          ""
      );
  }, []);

  // ---------- sort by displayed label, keeping original options untouched ----------
  const sortedOptions = useMemo(() => {
    if (!stateData) return [];
    return [...stateData].sort((a, b) =>
      String(getTranslatedLabel(a)).localeCompare(String(getTranslatedLabel(b)))
    );
  }, [stateData, getTranslatedLabel]);

  // currVal is a real selection only when it has a `value` field (API data)
  // placeholder objects passed from parent only have `label`
  const selectedValue =
    currVal && typeof currVal === "object" && !Array.isArray(currVal)
      ? currVal
      : null;
  const placeholderText = placeholder || label || currVal?.label || "Select...";

  const customStyles = {
    container: (provided) => ({ ...provided, width: "100%" }),
    control: (base, state) => ({
      ...base,
      borderColor: "black",
      backgroundColor: "white",
      textAlign: "center",
      width: "100%",
    }),
    option: (styles, { isFocused, isSelected }) => ({
      ...styles,
      color: "#111827",
      backgroundColor: isSelected
        ? "#11182732"
        : isFocused
        ? "#11182717"
        : undefined,
      ":active": { ...styles[":active"], backgroundColor: "#11182717" },
    }),
    menu: (provided) => ({ ...provided, width: "100%" }),
  };

  return (
    <div className="w-full">
      <Select
        styles={customStyles}
        options={sortedOptions}
        value={selectedValue}
        getOptionLabel={getTranslatedLabel}
        getOptionValue={getOptionValue}
        placeholder={placeholderText}
        onChange={(e) => handleItemSelect(setState, e)}
        isDisabled={!stateData || stateData.length === 0}
      />
    </div>
  );
};

export default SelectButton;
