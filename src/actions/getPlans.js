export default async function getPlans(block_id = null) {
    try {
      let response = await fetch(
        `${process.env.REACT_APP_API_URL}/watershed/plans/`,
        {
          method: "GET",
          headers: {
            "ngrok-skip-browser-warning": "1",
            "Content-Type": "application/json",
            "X-API-Key": `${process.env.REACT_APP_API_KEY}`,
          },
        }
      );
  
      response = await response.json();
  console.log(response)
      let result = [];
  
      response.map((item) => {
        result.push({
          label: item.plan,
          value: item,
        });
      });
  
      return {
        raw: response,   
        list: result,    
      };
  
    } catch (e) {
      console.log("Not able to Fetch Plans !", e);
      return { raw: [], list: [] };
    }
  }
  