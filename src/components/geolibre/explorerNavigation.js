export const explorerUrl = ({ state, district, tehsil }) => {
  if (!state || !district || !tehsil) return "/explore_data";
  return `/explore_data?${new URLSearchParams({ state, district, tehsil })}`;
};
