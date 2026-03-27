import { useMemo } from "react";
import Select from "react-select";

const SelectButton = ({
  stateData,
  handleItemSelect,
  setState,
  currVal,
  className = "",
  placeholder = "Select option",
}) => {
  // ---------- sort by label, keeping original untouched ----------
  const sortedOptions = useMemo(() => {
    if (!stateData) return [];
    return [...stateData].sort((a, b) => a.label.localeCompare(b.label));
  }, [stateData]);

  const customStyles = {
    container: (provided) => ({ ...provided, width: "100%" }),
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 12,
      borderColor: state.isFocused ? "#8B5CF6" : "#D1D5DB",
      backgroundColor: state.isDisabled ? "#F9FAFB" : "white",
      textAlign: "left",
      width: "100%",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(139, 92, 246, 0.18)" : "none",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      transition: "border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease",
      "&:hover": {
        borderColor: state.isFocused ? "#8B5CF6" : "#A78BFA",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      paddingLeft: 10,
      paddingRight: 10,
    }),
    placeholder: (base) => ({
      ...base,
      color: "#6B7280",
    }),
    singleValue: (base) => ({
      ...base,
      color: "#111827",
    }),
    option: (styles, { isFocused, isSelected }) => ({
      ...styles,
      color: "#111827",
      backgroundColor: isSelected
        ? "#EDE9FE"
        : isFocused
        ? "#F5F3FF"
        : undefined,
      cursor: "pointer",
      transition: "background-color 180ms ease",
      ":active": { ...styles[":active"], backgroundColor: "#DDD6FE" },
    }),
    menu: (provided) => ({
      ...provided,
      width: "100%",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 16px 32px rgba(15, 23, 42, 0.14)",
    }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: state.isFocused ? "#8B5CF6" : "#6B7280",
      transition: "color 180ms ease, transform 180ms ease",
      transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : "rotate(0deg)",
    }),
  };

  return (
    <div className={`w-full ${className}`}>
      <Select
        classNamePrefix="react-select"
        styles={customStyles}
        options={sortedOptions}
        value={currVal}
        onChange={(e) => handleItemSelect(setState, e)}
        isDisabled={!stateData}
        placeholder={placeholder}
      />
    </div>
  );
};

export default SelectButton;
