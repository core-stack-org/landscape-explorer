export default async function getPlans(block_id) {
    try {
        let response = await fetch(`${process.env.REACT_APP_API_URL}/get_plans/?block_id=${block_id}`, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "1",
                "Content-Type": "application/json",
                }
            }
        )
    response = await response.json()

    let result = []

    response.plans.map((item, idx) => {
        let tempObj = {}
        tempObj['label'] = item.plan
        tempObj['value'] = item
        result.push(tempObj)
    })

    return result

    }catch(e){
        console.log("Not able to Fetch Plans !",e)
    }
}

