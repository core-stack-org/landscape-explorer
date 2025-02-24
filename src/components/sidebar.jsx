import { useState } from "react";
import styles from "./css/sidebar.module.css"
import back_icon from "../assets/left-arrow.svg"
import landscape_icon from "../assets/eco.png"

import well_icon from "../assets/well_proposed.svg"
import livelihood_icon from "../assets/livelihood_proposed.svg"
import settlement_icon from "../assets/settlement_icon.svg"
import farm_pond_icon from "../assets/farm_pond_proposed.svg"
import land_leveling_icon from "../assets/land_leveling_proposed.svg"
import boulder_icon from "../assets/boulder_proposed.svg"
import waterbodies_icon from "../assets/waterbodies_proposed.svg"
import tcb_icon from "../assets/tcb_proposed.svg"
import check_dam_icon from "../assets/check_dam_proposed.svg"

import layerDetail from "./data/layers_details.json"
import TabButton from "./buttons/tab_button";

const Sidebar = () => {

    const [isOpen, setOpen] = useState(false);
    const [currTab, setCurrTab] = useState("panchayat_boundaries");
    const [currSection, setCurrSection] = useState("Panchayat Boundaries")

    //? Button mappings
    const buttonMap = [
        {json_name : "panchayat_boundaries", name : "Panchayat Demographics"},
        {json_name : "drainage_layer", name : "Drainage Layer"},
        {json_name : "mws_layer", name : "Hydrological Variables Layer"},
        {json_name : "nrega_layer", name : "NREGA Layer"},
        {json_name : "terrain_layer", name : "Terrain Layer"},
        {json_name : "drought_layer", name : "Drought Layer"},
        {json_name : "hydrological_layer", name : "Hydrological Boundries"},
        {json_name : "waterbodies_layer", name : "Waterbodies Layer"},
        {json_name : "lulc_layer", name : "LULC Layer"}
    ]

    const toggleTabs = (name, section) => {
        setCurrTab(name);
        setCurrSection(section);
    }

    const handleLayerStyleDownload = (url) => {
        window.open(url)
    }

    return (
        <div className={isOpen ? styles.wrapper_show : styles.wrapper_hide}>
            <div className={styles.top_menu_wrapper}>
                <label
                    className="bg-green-600 rounded-md p-1 cursor-pointer flex justify-center hover:bg-emerald-700"
                    onClick={() => setOpen(!isOpen)}
                >
                    <svg
                    width="35"
                    height="35"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="butt"
                    strokeLinejoin="arcs"
                    >
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </label>
            </div>

            <div className={isOpen ? styles.m_menu_visible : styles.m_menu}>
                <div className={styles.m_menu__header}>
                    <label
                    className={styles.m_menu__toggle}
                    onClick={() => setOpen(!isOpen)}
                    >
                    <img src={back_icon} className="h-14 w-12 cursor-pointer"/>
                    </label>
                    <span><img src={landscape_icon} className="w-8 h-8"/>{"Landscape Explorer"}</span>
                    <p className="text-slate-200 font-semibold text-sm">v1.0.0</p>
                </div>
                <div className="p-1 mt-2 sticky">
                    {buttonMap.map((item,idx) => {
                        return(
                            <TabButton key = {idx} name={item.name} onClickEvent={() => toggleTabs(item.json_name, item.name)}/>
                        )
                    })}
                </div>
                <div className="flex-col p-3">
                    <div className="text-md font-semibold text-slate-200 p-1 underline underline-offset-4">{currSection}</div>
                    <div className="text-slate-200 p-5 flex-col">
                    <article className="pb-5 overflow-y-scroll h-64 text-sm">
                        {layerDetail[currTab]["info"]}
                    </article>
                    <button className="bg-slate-200 p-3 rounded-xl text-emerald-700 text-xs shadow-2xl mt-2" onClick={event =>  window.location.href='https://gitlab.com/corestack.org/corestack'}>KNOW MORE</button>
                    {layerDetail[currTab]["style_url"].map((item) => {
                        return(
                            <button className="bg-slate-200 p-3 rounded-xl text-emerald-700 text-xs shadow-2xl mt-2 ml-2" onClick={()=> handleLayerStyleDownload(item["url"])}>{item["name"]}</button>
                        )
                    })}
                    </div>
                </div>
                {currSection !== "NREGA Layer" ?
                <>
                    <span className="font-semibold text-slate-200 p-3 underline text-md underline-offset-4">Map Marker's Directory</span>
                    <div className="flex-col p-5 overflow-y-scroll h-48 mt-1 mr-9">
                        <div className="flex items-center p-1">
                            <img src={well_icon} className="h-14 w-12"/>
                            <span className="text-slate-200 font-thin text-md pl-3">Well Marker</span>
                        </div>
                        <div className="flex items-center p-1">
                            <img src={livelihood_icon} className="h-14 w-12"/>
                            <span className="text-slate-200 font-thin text-md pl-3">Livelihood Marker</span>
                        </div>
                        <div className="flex items-center p-1">
                            <img src={settlement_icon} className="h-14 w-12"/>
                            <span className="text-slate-200 font-thin text-md pl-3">Settlement Marker</span>
                        </div>
                        <div className="flex items-center p-1">
                            <img src={waterbodies_icon} className="h-14 w-12"/>
                            <span className="text-slate-200 font-thin text-md pl-3">Waterbodies Marker</span>
                        </div>
                        <div className="flex items-center p-1">
                            <img src={tcb_icon} className="h-14 w-12"/>
                            <span className="text-slate-200 font-thin text-md pl-3">Trench-Cum-Bund Marker</span>
                        </div>
                        <div className="flex items-center p-1">
                            <img src={land_leveling_icon} className="h-14 w-12"/>
                            <span className="text-slate-200 font-thin text-md pl-3">Land Leveling Marker</span>
                        </div>
                        <div className="flex items-center p-1">
                            <img src={farm_pond_icon} className="h-14 w-12"/>
                            <span className="text-slate-200 font-thin text-md pl-3">Farm Pond Marker</span>
                        </div>
                        <div className="flex items-center p-1">
                            <img src={check_dam_icon} className="h-14 w-12"/>
                            <span className="text-slate-200 font-thin text-md pl-3">Check Dam Marker</span>
                        </div>
                        <div className="flex items-center p-1">
                            <img src={boulder_icon} className="h-14 w-12"/>
                            <span className="text-slate-200 font-thin text-md pl-3">Boulder Marker</span>
                        </div>
                    </div>
                </> 
                : 
                <>
                    <span className="font-semibold text-slate-200 p-3 underline text-md underline-offset-4">NREGA Color Coding</span>
                    <div className="flex-col p-5 overflow-y-scroll h-48 mt-1 mr-9 mb-4">
                        <div className="flex items-center p-1">
                            <div className="h-5 w-5 rounded-xl bg-yellow-500"/>
                            <span className="text-slate-200 font-thin text-md pl-3">Land Restoration</span>
                        </div>
                        <div className="flex items-center p-1">
                            <div className="h-5 w-5 rounded-xl bg-pink-400"/>
                            <span className="text-slate-200 font-thin text-md pl-3">Off-Farm Livelihood Assets</span>
                        </div>
                        <div className="flex items-center p-1">
                            <div className="h-5 w-5 rounded-xl bg-sky-800"/>
                            <span className="text-slate-200 font-thin text-md pl-3">Irrigation on farms</span>
                        </div>
                        <div className="flex items-center p-1">
                            <div className="h-5 w-5 rounded-xl bg-emerald-400"/>
                            <span className="text-slate-200 font-thin text-md pl-3">Plantations</span>
                        </div>
                        <div className="flex items-center p-1">
                            <div className="h-5 w-5 rounded-xl bg-blue-400"/>
                            <span className="text-slate-200 font-thin text-md pl-3">Soil and Water Conservation</span>
                        </div>
                        <div className="flex items-center p-1">
                            <div className="h-5 w-5 rounded-xl bg-gray-600"/>
                            <span className="text-slate-200 font-thin text-md pl-3">Community Assets</span>
                        </div>
                        <div className="flex items-center p-1">
                            <div className="h-5 w-5 rounded-xl bg-zinc-800"/>
                            <span className="text-slate-200 font-thin text-md pl-3">Unidentified</span>
                        </div>
                    </div>
                </>
                }
            </div>
        </div>
    )

}

export default Sidebar