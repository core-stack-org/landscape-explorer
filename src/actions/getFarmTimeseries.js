const GRAPHQL_URL = 'http://0.0.0.0:8000/graphql/v1';

const FARM_TIMESERIES_QUERY = `
  query FarmTimeseries($state: String!, $district: String!, $block: String!, $farmId: String!) {
    farmTimeseries(state: $state, district: $district, block: $block, farmId: $farmId) {
      annual {
        year
        areaInHa
        aetAnnual
        petAnnual
        maiAnnual
        kharifMai
        kharifWaterStress
        kharifSevereStress
        crop1
        conf1
        crop2
        conf2
        crop3
        conf3
        cropStartDate
        cropEndDate
      }
      monthly {
        year
        date
        aet
        pet
        mai
      }
    }
  }
`;

export default async function getFarmTimeseries(stateLabel, districtLabel, blockLabel, farmId) {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: FARM_TIMESERIES_QUERY,
      variables: {
        state: stateLabel.toLowerCase(),
        district: districtLabel.toLowerCase(),
        block: blockLabel.toLowerCase(),
        farmId,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: HTTP ${response.status}`);
  }

  const json = await response.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }

  // Returns { annual: [...], monthly: [...] } — caller picks which to render.
  return json.data.farmTimeseries;
}