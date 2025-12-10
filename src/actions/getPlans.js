export default async function getPlans(block_id=null) {
    try {
        let response = await fetch(`${process.env.REACT_APP_API_URL}/watershed/plans`, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "1",
                "Content-Type": "application/json",
                "X-API-Key" : `${process.env.REACT_APP_API_KEY}`,
                }
            }
        )
    response = await response.json()

    let result = []

    response.map((item, idx) => {
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

