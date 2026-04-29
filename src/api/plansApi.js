const DEFAULT_BASE_URL = process.env.REACT_APP_API_URL || "";

const request = async (endpoint, apiKey) => {
  const url = endpoint.startsWith("http") ? endpoint : `${DEFAULT_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "420",
      "X-API-Key": apiKey || process.env.REACT_APP_API_KEY,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error ${res.status}: ${text}`);
  }

  return res.json();
};

export const fetchPlansMetaStats = async (
  apiKey = process.env.REACT_APP_API_KEY,
  organizationId = null
) => {
  let endpoint = "/watershed/plans/meta-stats/";
  if (organizationId) endpoint += `?organization=${encodeURIComponent(organizationId)}`;
  return request(endpoint, apiKey);
};

export const fetchStewardsMetaStats = async (
  apiKey = process.env.REACT_APP_API_KEY,
  organizationId = null
) => {
  let endpoint = "/watershed/plans/steward-meta-stats/";
  if (organizationId) endpoint += `?organization=${encodeURIComponent(organizationId)}`;
  return request(endpoint, apiKey);
};

export const fetchStewardsByState = async (
  stateId,
  apiKey = process.env.REACT_APP_API_KEY
) => {
  // Since the state-specific endpoint doesn't exist, use the global endpoint
  // and filter for the specific state on the client side
  const endpoint = `/watershed/plans/steward-meta-stats/?state=${encodeURIComponent(stateId)}`;
  return request(endpoint, apiKey);
};
