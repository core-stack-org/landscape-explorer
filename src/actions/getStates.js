import locations from "../locations.json";

export default async function getStates() {
    
    try{
        let response = await fetch(`${process.env.REACT_APP_API_URL}/proposed_blocks/`, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "1",
                "Content-Type": "application/json",
            },
        })
        response = await response.json()
        console.log(response)
        return response
    } catch(err){
        console.log(err);
        return locations;
    }
}