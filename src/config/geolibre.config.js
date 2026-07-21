const DEFAULT_VIEWER_URL = "https://web.geolibre.app/";

/**
 * The GeoLibre application version KYL expects to embed.
 *
 * For a compatible GeoLibre 2.x update, this is normally the only value that
 * needs to change. The iframe handshake verifies that the deployed viewer
 * reports the same version before KYL sends it a project.
 */
export const GEOLIBRE_CONFIG = Object.freeze({
  version: process.env.REACT_APP_GEOLIBRE_VERSION || "2.2.0",
  minimumCompatibleVersion: "2.2.0",
  supportedMajorVersion: 2,
  viewerUrlTemplate:
    process.env.REACT_APP_GEOLIBRE_URL_TEMPLATE ||
    process.env.REACT_APP_GEOLIBRE_URL ||
    DEFAULT_VIEWER_URL,
  strictVersion:
    process.env.REACT_APP_GEOLIBRE_STRICT_VERSION !== "false",
});

// GeoLibre's project schema version is independent from its application release.
export const GEOLIBRE_PROJECT_FORMAT_VERSION = "0.2.0";

const parseVersion = (value) => {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(
    String(value || "").trim()
  );
  return match ? match.slice(1).map(Number) : null;
};

const compareVersions = (left, right) => {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
};

export const resolveGeoLibreViewer = (config = GEOLIBRE_CONFIG) => {
  const version = String(config.version).replace(/^v/, "");
  const resolvedTemplate = config.viewerUrlTemplate.replaceAll(
    "{version}",
    version
  );
  const url = new URL(resolvedTemplate);
  url.searchParams.set("embed", "1");
  url.searchParams.set("welcome", "0");
  return { url: url.toString(), origin: url.origin };
};

export const geoLibreVersionStatus = (
  actualVersion,
  config = GEOLIBRE_CONFIG
) => {
  const actual = parseVersion(actualVersion);
  const expected = parseVersion(config.version);
  const minimum = parseVersion(config.minimumCompatibleVersion);

  if (!actual || !expected || !minimum) {
    return {
      compatible: false,
      message: `GeoLibre reported an invalid version (${actualVersion || "missing"}).`,
    };
  }

  const supportedMajorVersion = Number(
    config.supportedMajorVersion ?? minimum[0]
  );
  if (
    actual[0] !== supportedMajorVersion ||
    expected[0] !== supportedMajorVersion ||
    compareVersions(actual, minimum) < 0
  ) {
    return {
      compatible: false,
      message: `GeoLibre ${actualVersion} is not compatible with this KYL integration (requires ${config.minimumCompatibleVersion} or newer in major version ${supportedMajorVersion}).`,
    };
  }

  if (config.strictVersion && compareVersions(actual, expected) !== 0) {
    return {
      compatible: false,
      message: `KYL is configured for GeoLibre ${config.version}, but the iframe loaded ${actualVersion}. Update the configured version only after compatibility testing.`,
    };
  }

  return { compatible: true, message: "" };
};
