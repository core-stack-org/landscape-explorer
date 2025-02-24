import './tab_button.css'

const TabButton = ({name, onClickEvent}) =>{
    return (
        <>
        <button className="button-68" onClick={onClickEvent}>{name}</button>
        </>
    )
}

export default TabButton