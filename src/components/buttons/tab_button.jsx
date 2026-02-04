import React from 'react';
import './tab_button.css'

const TabButton = ({name, onClickEvent, isActive}) =>{
    return (
        <>
        <button className={`button-68 ${isActive ? 'button-68-active' : ''}`} onClick={onClickEvent}>{name}</button>
        </>
    )
}

export default TabButton