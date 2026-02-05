import { useMemo } from 'react';
import Select from 'react-select';

const SelectButton = ({ stateData, handleItemSelect, setState, currVal }) => {
  // ---------- sort by label, keeping original untouched ----------
  const sortedOptions = useMemo(() => {
    if (!stateData) return [];
    return [...stateData].sort((a, b) => a.label.localeCompare(b.label));
  }, [stateData]);

  const customStyles = {
    container: (provided) => ({ ...provided, width: '100%' }),
    control: (base, state) => ({
      ...base,
      borderColor: 'black',
      backgroundColor: 'white',
      textAlign: 'center',
      width: '100%',
    }),
    option: (styles, { isFocused, isSelected }) => ({
      ...styles,
      color: '#111827',
      backgroundColor: isSelected
        ? '#11182732'
        : isFocused
        ? '#11182717'
        : undefined,
      ':active': { ...styles[':active'], backgroundColor: '#11182717' },
    }),
    menu: (provided) => ({ ...provided, width: '100%' }),
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