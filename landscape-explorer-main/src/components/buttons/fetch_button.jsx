import './fetch_button.css'

const FetchButton = ({name, onClickEvent, isDisabled}) => {
    return (
        <button className="button-37" onClick={onClickEvent} disabled={isDisabled}>{name}</button>
    )
}

export default FetchButton