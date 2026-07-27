import type {
  GeoLibreLayer,
  MapViewState,
  StoryChapter,
  StoryChapterLocation,
  StoryLayerOpacityChange,
  StoryMap,
} from "@geolibre/core";
import {
  resolveKylFilterSelections,
  type KylExploreSource,
} from "./explore-filters";
import {
  coreGeoStackLayer,
  slugLocationPart,
  type CoreGeoStackDomain,
  type CoreGeoStackLayerDefinition,
} from "./layer-catalog";
import type { CoreGeoStackLocation } from "./workspace-state";

type StoryLayer = Pick<GeoLibreLayer, "id" | "name" | "opacity" | "visible">;

export interface CoreGeoStackStoryResultSummary {
  source: KylExploreSource;
  total: number;
  matched: number;
  derived?: boolean;
}

export interface BuildCoreGeoStackTehsilStoryInput {
  location: Required<CoreGeoStackLocation>;
  selectedLayerIds: readonly string[];
  selectedFilterIds: readonly string[];
  mapView: Pick<MapViewState, "center" | "zoom" | "pitch" | "bearing">;
  layers: readonly StoryLayer[];
  results?: readonly CoreGeoStackStoryResultSummary[];
}

export interface CoreGeoStackTehsilStorySummary {
  chapterCount: number;
  domainCount: number;
  filterCount: number;
  liveLayerCount: number;
}

export const CORE_TEHSIL_STORY_SCHEMA = "core-tehsil-v1";
const EXPLORE_LAYER_NAMES: Record<KylExploreSource, string> = {
  MWS: "Explore · Micro-watersheds",
  Village: "Explore · Villages",
  Waterbody: "Explore · Waterbodies",
};

const SOURCE_LABELS: Record<KylExploreSource, string> = {
  MWS: "Micro-watershed evidence",
  Village: "Village evidence",
  Waterbody: "Waterbody evidence",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function storyBaseId(location: Required<CoreGeoStackLocation>): string {
  return [
    CORE_TEHSIL_STORY_SCHEMA,
    slugLocationPart(location.state),
    slugLocationPart(location.district),
    slugLocationPart(location.tehsil),
  ].join(":");
}

function camera(
  mapView: BuildCoreGeoStackTehsilStoryInput["mapView"],
  zoomDelta = 0,
): StoryChapterLocation {
  return {
    center: [...mapView.center] as [number, number],
    zoom: Math.max(4, Math.min(16, mapView.zoom + zoomDelta)),
    pitch: mapView.pitch,
    bearing: mapView.bearing,
  };
}

function layerChanges(
  sceneId: string,
  layers: readonly StoryLayer[],
  focalLayerIds: ReadonlySet<string>,
  contextLayerIds: ReadonlySet<string> = new Set(),
): StoryLayerOpacityChange[] {
  return layers
    .filter((layer) => layer.visible)
    .map((layer) => ({
      id: `${sceneId}:${layer.id}`,
      layerId: layer.id,
      opacity: focalLayerIds.has(layer.id)
        ? Math.max(0.82, layer.opacity)
        : contextLayerIds.has(layer.id)
          ? Math.min(0.35, layer.opacity)
          : Math.min(0.08, layer.opacity),
      duration: 350,
    }));
}

function restoreLayerChanges(
  sceneId: string,
  layers: readonly StoryLayer[],
): StoryLayerOpacityChange[] {
  return layers
    .filter((layer) => layer.visible)
    .map((layer) => ({
      id: `${sceneId}:${layer.id}`,
      layerId: layer.id,
      opacity: layer.opacity,
      duration: 350,
    }));
}

function chapter(
  id: string,
  title: string,
  description: string,
  location: StoryChapterLocation,
  onChapterEnter: StoryLayerOpacityChange[],
  alignment: StoryChapter["alignment"] = "left",
): StoryChapter {
  return {
    id,
    title,
    description,
    alignment,
    hidden: false,
    location,
    mapAnimation: "easeTo",
    rotateAnimation: false,
    onChapterEnter,
    onChapterExit: [],
  };
}

function selectedDefinitions(
  selectedLayerIds: readonly string[],
): CoreGeoStackLayerDefinition[] {
  return selectedLayerIds
    .map(coreGeoStackLayer)
    .filter((definition): definition is CoreGeoStackLayerDefinition => definition !== null);
}

function liveLayerForDefinition(
  definition: CoreGeoStackLayerDefinition,
  layers: readonly StoryLayer[],
): StoryLayer | undefined {
  return layers.find((layer) => layer.name === definition.label);
}

function groupDefinitionsByDomain(
  definitions: readonly CoreGeoStackLayerDefinition[],
): Map<CoreGeoStackDomain, CoreGeoStackLayerDefinition[]> {
  const grouped = new Map<CoreGeoStackDomain, CoreGeoStackLayerDefinition[]>();
  for (const definition of definitions) {
    if (definition.domain === "Demographic") continue;
    const current = grouped.get(definition.domain) ?? [];
    current.push(definition);
    grouped.set(definition.domain, current);
  }
  return grouped;
}

function definitionList(definitions: readonly CoreGeoStackLayerDefinition[]): string {
  return definitions.map((definition) => escapeHtml(definition.label)).join(", ");
}

function resultText(
  source: KylExploreSource,
  results: readonly CoreGeoStackStoryResultSummary[],
): string {
  const result = results.find((entry) => entry.source === source);
  if (!result) return "The live result count was not available when this scene was generated.";
  const qualifier = result.derived ? " derived context features" : " matching features";
  return `${result.matched} of ${result.total}${qualifier} are visible in this scene.`;
}

function coreLiveLayers(
  definitions: readonly CoreGeoStackLayerDefinition[],
  layers: readonly StoryLayer[],
): StoryLayer[] {
  const names = new Set([
    ...definitions.map((definition) => definition.label),
    ...Object.values(EXPLORE_LAYER_NAMES),
  ]);
  return layers.filter((layer) => names.has(layer.name));
}

export function summarizeCoreGeoStackTehsilStory(
  input: BuildCoreGeoStackTehsilStoryInput,
): CoreGeoStackTehsilStorySummary {
  const definitions = selectedDefinitions(input.selectedLayerIds);
  const domains = groupDefinitionsByDomain(definitions);
  return {
    chapterCount: buildCoreGeoStackTehsilStory(input).chapters.length,
    domainCount: domains.size,
    filterCount: resolveKylFilterSelections(input.selectedFilterIds).length,
    liveLayerCount: coreLiveLayers(definitions, input.layers).length,
  };
}

export function buildCoreGeoStackTehsilStory(
  input: BuildCoreGeoStackTehsilStoryInput,
): StoryMap {
  const baseId = storyBaseId(input.location);
  const definitions = selectedDefinitions(input.selectedLayerIds);
  const layers = coreLiveLayers(definitions, input.layers);
  const results = input.results ?? [];
  const chapters: StoryChapter[] = [];

  const administrative = definitions.find(
    (definition) => definition.id === "administrative_boundaries",
  );
  const demographics = definitions.find((definition) => definition.id === "demographics");
  const administrativeLayer = administrative
    ? liveLayerForDefinition(administrative, layers)
    : undefined;
  const demographicLayer = demographics
    ? liveLayerForDefinition(demographics, layers)
    : undefined;
  const contextIds = new Set(
    [administrativeLayer?.id, demographicLayer?.id].filter(
      (id): id is string => Boolean(id),
    ),
  );

  const orientationId = `${baseId}:orientation`;
  chapters.push(
    chapter(
      orientationId,
      `${input.location.tehsil} in context`,
      `<p><strong>${escapeHtml(input.location.tehsil)}</strong> is shown within ${escapeHtml(
        input.location.district,
      )}, ${escapeHtml(
        input.location.state,
      )}. This opening scene establishes the active administrative landscape before the thematic evidence is introduced.</p>`,
      camera(input.mapView, -0.65),
      layerChanges(
        orientationId,
        layers,
        new Set(administrativeLayer ? [administrativeLayer.id] : []),
        contextIds,
      ),
    ),
  );

  const peopleId = `${baseId}:people`;
  chapters.push(
    chapter(
      peopleId,
      "People, settlements, and administration",
      "<p>The administrative and socio-economic layers form the common reference frame for interpreting every later landscape signal. Boundaries provide orientation; village attributes provide the human context.</p>",
      camera(input.mapView, 0),
      layerChanges(
        peopleId,
        layers,
        new Set(
          [demographicLayer?.id, administrativeLayer?.id].filter(
            (id): id is string => Boolean(id),
          ),
        ),
      ),
      "right",
    ),
  );

  for (const [domain, domainDefinitions] of groupDefinitionsByDomain(definitions)) {
    const liveDomainLayers = domainDefinitions
      .map((definition) => liveLayerForDefinition(definition, layers))
      .filter((layer): layer is StoryLayer => Boolean(layer));
    const sceneId = `${baseId}:domain:${slugLocationPart(domain)}`;
    chapters.push(
      chapter(
        sceneId,
        `${domain} lens`,
        `<p>This scene brings the selected ${escapeHtml(
          domain,
        )} evidence forward: ${definitionList(
          domainDefinitions,
        )}. The administrative layers remain as quiet spatial context.</p>`,
        camera(input.mapView, 0.2),
        layerChanges(
          sceneId,
          layers,
          new Set(liveDomainLayers.map((layer) => layer.id)),
          contextIds,
        ),
        chapters.length % 2 === 0 ? "left" : "right",
      ),
    );
  }

  const selections = resolveKylFilterSelections(input.selectedFilterIds);
  for (const source of ["MWS", "Village", "Waterbody"] as const) {
    const sourceSelections = selections.filter((selection) => selection.source === source);
    if (!sourceSelections.length) continue;
    const resultLayer = layers.find((layer) => layer.name === EXPLORE_LAYER_NAMES[source]);
    const sceneId = `${baseId}:filter:${source.toLowerCase()}`;
    const filterList = sourceSelections
      .map(
        (selection) =>
          `<li><strong>${escapeHtml(selection.definition.label)}:</strong> ${escapeHtml(
            selection.option.label,
          )}</li>`,
      )
      .join("");
    chapters.push(
      chapter(
        sceneId,
        SOURCE_LABELS[source],
        `<p>The current KYL exploration applies these committed choices:</p><ul>${filterList}</ul><p>${escapeHtml(
          resultText(source, results),
        )}</p>`,
        camera(input.mapView, 0.45),
        layerChanges(
          sceneId,
          layers,
          new Set(resultLayer ? [resultLayer.id] : []),
          contextIds,
        ),
        chapters.length % 2 === 0 ? "left" : "right",
      ),
    );
  }

  if (chapters.length > 2) {
    const synthesisId = `${baseId}:synthesis`;
    chapters.push(
      chapter(
        synthesisId,
        "The current landscape evidence",
        "<p>The final scene restores the complete selected workspace. It is a reproducible synthesis of the tehsil, chosen thematic layers, and committed KYL filters—not a separate copy of the analysis.</p>",
        camera(input.mapView),
        restoreLayerChanges(synthesisId, layers),
        "center",
      ),
    );
  }

  return {
    title: `${input.location.tehsil} — Know Your Landscape`,
    subtitle: `${input.location.district}, ${input.location.state}`,
    byline: "CoRE-GeoStack",
    footer:
      "Generated from the current CoRE-GeoStack workspace using CoRE Stack KYL and GeoServer sources.",
    theme: "dark",
    showMarkers: false,
    markerColor: "#8b5cf6",
    inset: true,
    insetPosition: "bottom-right",
    hideChapterNav: false,
    startSlide: "none",
    endSlide: "adjacent",
    chapters,
  };
}

export function isCoreGeoStackTehsilStory(story: StoryMap | null): boolean {
  return Boolean(
    story?.chapters[0]?.id.startsWith(`${CORE_TEHSIL_STORY_SCHEMA}:`),
  );
}
