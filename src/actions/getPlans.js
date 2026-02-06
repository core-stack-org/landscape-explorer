export default async function getPlans(filters = {}) {
  let url = `${process.env.REACT_APP_API_URL}/watershed/plans`;
  const params = new URLSearchParams();

  if (filters.state) params.append("state", filters.state);
  if (filters.block) params.append("block", filters.block);
  if (filters.tehsil) params.append("tehsil", filters.tehsil);
  if (filters.filter_test_plan)
    params.append("filter_test_plan", filters.filter_test_plan);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }


  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.REACT_APP_API_KEY,
    },
  });

  const data = await res.json();
  return { raw: data, list: data.map(d => ({ label: d.plan, value: d })) };
}

// export default async function getPlans(state = null, block = null) {
//     try {
//       let url = `${process.env.REACT_APP_API_URL}/watershed/plans`;
//       const params = new URLSearchParams();
  
//       let stateId = null;
//       if (state && typeof state === "object") {
//         stateId = state.state_id || state.id || state.state;
//       } else {
//         stateId = state;
//       }
  
//       let blockId = null;
//       if (block && typeof block === "object") {
//         blockId = block.block_id || block.id;
//       } else {
//         blockId = block;
//       }
  
//       if (stateId) params.append("state", stateId);
//       if (blockId) params.append("block", blockId);
  
//       if (params.toString()) {
//         url += `?${params.toString()}`;
//       }
  
  
//       let response = await fetch(url, {
//         method: "GET",
//         headers: {
//           "ngrok-skip-browser-warning": "1",
//           "Content-Type": "application/json",
//           "X-API-Key": process.env.REACT_APP_API_KEY,
//         },
//       });
  
//       response = await response.json();
//       console.log(response)

//       const result = response.map((item) => ({
//         label: item.plan,
//         value: item,
//       }));

//       console.log(result)
  
//       return { raw: response, list: result };
//     } catch (e) {
//       console.error(" Not able to Fetch Plans!", e);
//       return { raw: [], list: [] };
//     }
//   }
  
