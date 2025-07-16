import locations from "../locations.json";

export default async function getStates() {
    
    try{
        const response = await fetch(`${process.env.REACT_APP_API_URL}/proposed_blocks/`, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "1",
                "Content-Type": "application/json",
            },
        })
        //console.log(await response.json())
        return await response.json()
    } catch(err){
        console.log(err);
        return locations;
    }
}