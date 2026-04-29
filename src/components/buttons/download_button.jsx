import "./download_button.css";

const DownloadButton = ({
  name,
  onClick = () => {},
  disabled = false
}) => {
  return (
    <button
      className="button-3"
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {name}
    </button>
  );
};

export default DownloadButton;