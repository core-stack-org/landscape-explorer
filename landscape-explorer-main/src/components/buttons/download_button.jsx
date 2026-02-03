import './download_button.css'

const DownloadButton = ({name, onClickEvent, href, download, isDisabled}) => {
    return(
        <button className="button-3" disabled={!isDisabled}>
        <a onClick={onClickEvent} href={href} download={download}>{name}</a>
        </button>
    )
}

export default DownloadButton;