import { useMemo } from 'react';
import Select from 'react-select';

const SelectButton = ({ stateData, handleItemSelect, setState, currVal }) => {
  // ---------- sort by label, keeping original untouched ----------
  const sortedOptions = useMemo(() => {
    if (!stateData) return [];
    return [...stateData].sort((a, b) => a.label.localeCompare(b.label));
  }, [stateData]);

  const customStyles = {
    container: (provided) => ({
      ...provided,
      width: '100%'
    }),
    control: (base, state) => ({
      ...base,
      borderColor: state.isFocused ? '#9333ea' : '#e5e7eb',
      borderWidth: '1.5px',
      borderRadius: '16px',
      backgroundColor: '#fafafa',
      textAlign: 'left',
      width: '100%',
      minHeight: '56px',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(147, 51, 234, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
      transition: 'all 0.2s ease',
      '&:hover': {
        borderColor: '#a855f7',
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '8px 16px',
    }),
    placeholder: (base) => ({
      ...base,
      color: '#9ca3af',
      fontSize: '16px',
    }),
    singleValue: (base) => ({
      ...base,
      color: '#374151',
      fontSize: '16px',
      fontWeight: '500',
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: state.isFocused ? '#9333ea' : '#9ca3af',
      padding: '8px 16px',
      transition: 'all 0.2s ease',
      '&:hover': {
        color: '#9333ea',
      },
    }),
    option: (styles, { isFocused, isSelected }) => ({
      ...styles,
      color: isSelected ? '#7c3aed' : '#374151',
      backgroundColor: isSelected
        ? '#f3e8ff'
        : isFocused
          ? '#faf5ff'
          : 'white',
      padding: '14px 20px',
      fontSize: '16px',
      fontWeight: isSelected ? '500' : '400',
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
      ':active': {
        ...styles[':active'],
        backgroundColor: '#ede9fe'
      },
    }),
    menu: (provided) => ({
      ...provided,
      width: '100%',
      borderRadius: '16px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
      marginTop: '6px',
    }),
    menuList: (base) => ({
      ...base,
      padding: '6px',
      maxHeight: '240px',
    }),
  };

  return (
    <div className="w-full">
      <Select
        styles={customStyles}
        options={sortedOptions}
        value={currVal}
        onChange={(e) => handleItemSelect(setState, e)}
        isDisabled={!stateData}
      />
    </div>
  );
};

export default SelectButton;
