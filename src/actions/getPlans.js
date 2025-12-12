export default async function getPlans(state = null,block=null) {
    console.log(state)
    try {
        console.log("inside tryyy")
        let response = await fetch(
            `https://92c32fb6bade.ngrok-free.app/api/v1/watershed/plans/`,
            // `${process.env.REACT_APP_API_URL}/watershed/plans`, 
            {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "1",
                "Content-Type": "application/json",
                "X-API-Key": "siOgP9SO.oUCc1vuWQRPkdjXjPmtIZYADe5eGl3FK"
                // "X-API-Key" : `${process.env.REACT_APP_API_KEY}`,
                }
            }
        )
    response = await response.json()
console.log(response)
    let result = []

    response.map((item) => {
        result.push({
          label: item.plan,
          value: item,
        });
      });

    // response.map((item, idx) => {
    //     let tempObj = {}
    //     tempObj['label'] = item.plan
    //     tempObj['value'] = item
    //     result.push(tempObj)
    // })


    return { raw: response, list: result };

    }catch(e){
        console.log("Not able to Fetch Plans !",e)
        return { raw: [], list: [] };
    }
}

