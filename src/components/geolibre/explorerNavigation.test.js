import { explorerUrl } from "./explorerNavigation";
test("selected tehsil URL survives spaces, punctuation and refresh", () => {
  const scope = {state:"State & Islands",district:"A/B",tehsil:"Tehsil name"};
  const url = new URL(explorerUrl(scope),"https://example.org");
  expect(url.pathname).toBe("/explore_data");
  expect(Object.fromEntries(url.searchParams)).toEqual(scope);
});
test("incomplete selection does not invent a location", () => expect(explorerUrl({state:"Bihar"})).toBe("/explore_data"));
