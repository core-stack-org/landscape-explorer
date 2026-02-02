import '../css/toggleButton.css'

const ToggleButton = ({currentLayers, handleCheckboxChange, checkboxId}) => {

    const handleCheckBoxToggle = (e) => {
      handleCheckboxChange()
    }

    return (
      <div className="checkbox-wrapper-8">
        <input className="tgl tgl-skewed" id={checkboxId} type="checkbox" defaultChecked={currentLayers.includes(checkboxId)} onChange={handleCheckBoxToggle}/>
        <label className="tgl-btn" data-tg-off="OFF" data-tg-on="ON" htmlFor={checkboxId}></label>
      </div>
    )
}

export default ToggleButton;