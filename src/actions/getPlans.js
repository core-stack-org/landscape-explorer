export default async function getPlans(state = null, block = null) {
    try {
      let url = `${process.env.REACT_APP_API_URL}/watershed/plans`;
      const params = new URLSearchParams();
  
      let stateId = null;
      if (state && typeof state === "object") {
        stateId = state.state_id || state.id || state.state;
      } else {
        stateId = state;
      }
  
      let blockId = null;
      if (block && typeof block === "object") {
        blockId = block.block_id || block.id;
      } else {
        blockId = block;
      }
  
      if (stateId) params.append("state", stateId);
      if (blockId) params.append("block", blockId);
  
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
  
  
      let response = await fetch(url, {
        method: "GET",
        headers: {
          "ngrok-skip-browser-warning": "1",
          "Content-Type": "application/json",
          "X-API-Key": process.env.REACT_APP_API_KEY,
        },
      });
  
      response = await response.json();
  
      const result = response.map((item) => ({
        label: item.plan,
        value: item,
      }));
  
      return { raw: response, list: result };
    } catch (e) {
      console.error(" Not able to Fetch Plans!", e);
      return { raw: [], list: [] };
    }
  }
  