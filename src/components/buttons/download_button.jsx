import './download_button.css'

const DownloadButton = ({ name, onClickEvent, isDisabled }) => {
  return (
    <button
      className="button-3"
      disabled={!isDisabled}
      onClick={onClickEvent}
    >
      {name}
    </button>
  )
}

export default DownloadButton;
