import '../css/toggleButton.css';

const ToggleButton = ({
  currentLayers,
  handleCheckboxChange,
  checkboxId
}) => {

  const isChecked = currentLayers.includes(checkboxId);

  return (
    <div className="checkbox-wrapper-8">
      <input
        className="tgl tgl-skewed"
        id={checkboxId}
        type="checkbox"
        checked={isChecked}
        onChange={handleCheckboxChange}
      />
      
      <label
        className="tgl-btn"
        data-tg-off="OFF"
        data-tg-on="ON"
        htmlFor={checkboxId}
      />
    </div>
  );
};

export default ToggleButton;