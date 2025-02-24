import Select from 'react-select';

const SelectButton = ({ stateData, handleItemSelect, setState, currVal }) => {
  const customStyles = {
    container: (provided) => ({
      ...provided,
      width: '100%', // This ensures the container takes full width of parent
    }),
    control: (baseStyles, state) => ({
      ...baseStyles,
      borderColor: 'black',
      width: '100%',
      textAlign: 'center',
      backgroundColor: 'white',
    }),
    option: (styles, { data, isDisabled, isFocused, isSelected }) => ({
      ...styles,
      color: '#111827',
      backgroundColor: isSelected ? '#11182732' : isFocused ? '#11182717' : '',
      ':active': {
        ...styles[':active'],
        backgroundColor: '#11182717',
      },
    }),
    // Adding menu styles to ensure dropdown takes full width
    menu: (provided) => ({
      ...provided,
      width: '100%',
    }),
  };

  return (
    <div className="w-full">
      <Select
        styles={customStyles}
        value={currVal}
        onChange={(e) => handleItemSelect(setState, e)}
        isDisabled={stateData == null}
        options={stateData}
      />
    </div>
  );
};

export default SelectButton;