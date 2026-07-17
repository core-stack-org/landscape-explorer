import { useMemo, useState } from "react";
import SelectButton from "../../buttons/select_button";
import {
  GEOLIBRE_LAYER_GROUPS,
  GEOLIBRE_LULC_YEARS,
} from "../../../config/geolibreLayers";
import { downloadExcel } from "../utils/downloadHelper";

const ChevronRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    fill="currentColor"
    viewBox="0 0 16 16"
  >
    <path
      fillRule="evenodd"
      d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    fill="currentColor"
    viewBox="0 0 16 16"
  >
    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
  </svg>
);

const LayerItem = ({ layer, isSelected, onToggle, isLoading }) => (
  <div className="border-b border-gray-200 py-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-gray-700">{layer.label}</p>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
          <span className="rounded bg-gray-100 px-1.5 py-0.5 uppercase">
            {layer.sourceType === "wfs" ? "Vector" : "Raster"}
          </span>
          <a
            href={layer.qmlStyleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-700 hover:underline"
          >
            QML style
          </a>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onToggle(layer.name)}
        disabled={isLoading}
        aria-pressed={isSelected}
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
          isSelected
            ? "bg-purple-600 text-white"
            : "bg-purple-100 text-purple-800 hover:bg-purple-200"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {isSelected ? "Included" : "Add"}
      </button>
    </div>
  </div>
);

const LulcSelector = ({ layer, selection, setSelection, isLoading }) => (
  <div
    className={`mb-3 rounded-md border border-gray-100 bg-white p-3 shadow-sm ${
      isLoading ? "pointer-events-none opacity-60" : ""
    }`}
  >
    <div className="mb-2 flex items-start justify-between gap-2">
      <div>
        <h4 className="text-sm font-medium text-gray-700">{layer.label}</h4>
        <a
          href={layer.qmlStyleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-purple-700 hover:underline"
        >
          QML style
        </a>
      </div>
      {selection?.value && (
        <span className="rounded-full bg-purple-600 px-2 py-1 text-[11px] font-medium text-white">
          Included
        </span>
      )}
    </div>
    <SelectButton
      currVal={selection || { label: "Select Year" }}
      stateData={GEOLIBRE_LULC_YEARS}
      handleItemSelect={(setter, value) => setter(value)}
      setState={setSelection}
    />
  </div>
);

const GeoLibreActions = ({
  onOpen,
  onDownload,
  onDownloadExcel,
  isLoading,
  canExport,
  selectedCount,
}) => (
  <div className="space-y-2 border-b border-gray-200 bg-purple-50 p-3">
    <div>
      <p className="text-sm font-semibold text-purple-950">GeoLibre workspace</p>
      <p className="text-xs leading-5 text-purple-800">
        {selectedCount
          ? `${selectedCount} live layer${selectedCount === 1 ? "" : "s"} selected with project styling.`
          : "Add layers below to create a styled GeoLibre project."}
      </p>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onOpen}
        disabled={!canExport || isLoading}
        className="rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        Open GeoLibre
      </button>
      <button
        type="button"
        onClick={onDownload}
        disabled={!canExport || isLoading}
        className="flex items-center justify-center gap-2 rounded-md border border-purple-300 bg-white px-3 py-2 text-sm font-medium text-purple-800 hover:bg-purple-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
      >
        <DownloadIcon />
        Project JSON
      </button>
    </div>
    <button
      type="button"
      onClick={onDownloadExcel}
      disabled={!canExport || isLoading}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
    >
      <DownloadIcon />
      Download tabular workbook
    </button>
  </div>
);

const RightSidebar = ({
  state,
  district,
  block,
  setState,
  setDistrict,
  setBlock,
  statesData,
  handleItemSelect,
  onClose,
  handleLayerToggle,
  toggledLayers,
  isLoading = false,
  canFetchLayers = false,
  lulcYear1,
  setLulcYear1,
  lulcYear2,
  setLulcYear2,
  lulcYear3,
  setLulcYear3,
  onOpenGeoLibre,
  onDownloadGeoLibre,
  selectedGeoLibreLayerCount = 0,
}) => {
  const [selectedCategory, setSelectedCategory] = useState("land");

  const selectedGroup = useMemo(
    () =>
      GEOLIBRE_LAYER_GROUPS.find((group) => group.id === selectedCategory) ||
      GEOLIBRE_LAYER_GROUPS[0],
    [selectedCategory]
  );

  const lulcSelections = {
    lulc_level_1: { value: lulcYear1, setter: setLulcYear1 },
    lulc_level_2: { value: lulcYear2, setter: setLulcYear2 },
    lulc_level_3: { value: lulcYear3, setter: setLulcYear3 },
  };

  const handleToggleClick = (layerName) => {
    if (!handleLayerToggle) return;
    handleLayerToggle(layerName, !Boolean(toggledLayers?.[layerName]));
  };

  const handleLocalExcelDownload = () => {
    if (!state || !district || !block) return;
    const url =
      "https://geoserver.core-stack.org/api/v1/download_excel_layer" +
      `?state=${encodeURIComponent(state.label)}` +
      `&district=${encodeURIComponent(district.label)}` +
      `&block=${encodeURIComponent(block.label)}`;
    downloadExcel(url, `${block.label}_data.xlsx`);
  };

  const canExport = Boolean(
    state && district && block && canFetchLayers && selectedGeoLibreLayerCount
  );

  return (
    <div className="relative flex h-full w-[380px] flex-col bg-white shadow-md">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Layers & Data</h2>
          <p className="text-xs text-gray-500">Build a tehsil GeoLibre project</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close layers panel"
          className="text-gray-500 hover:text-gray-700"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="border-b border-gray-200 bg-gray-50 p-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="min-w-[45px] text-sm text-gray-600">State</label>
            <SelectButton
              currVal={state || { label: "Select State" }}
              stateData={statesData}
              handleItemSelect={handleItemSelect}
              setState={setState}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-gray-800"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="min-w-[45px] text-sm text-gray-600">District</label>
            <SelectButton
              currVal={district || { label: "Select District" }}
              stateData={state !== null ? state.district : null}
              handleItemSelect={handleItemSelect}
              setState={setDistrict}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-gray-800"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="min-w-[45px] text-sm text-gray-600">Tehsil</label>
            <SelectButton
              currVal={block || { label: "Select Tehsil" }}
              stateData={district !== null ? district.blocks : null}
              handleItemSelect={handleItemSelect}
              setState={setBlock}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-gray-800"
            />
          </div>
        </div>
      </div>

      <GeoLibreActions
        onOpen={onOpenGeoLibre}
        onDownload={onDownloadGeoLibre}
        onDownloadExcel={handleLocalExcelDownload}
        isLoading={isLoading}
        canExport={canExport}
        selectedCount={selectedGeoLibreLayerCount}
      />

      <p className="px-3 py-2 text-center text-xs text-gray-400">
        CoRE Stack datasets are available under{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          CC BY 4.0
        </a>
      </p>

      {state && district && block && (
        <>
          <div className="border-b border-gray-200 px-3 pb-2">
            <div className="grid grid-cols-2 gap-2">
              {GEOLIBRE_LAYER_GROUPS.map((group) => (
                <button
                  type="button"
                  key={group.id}
                  className={`rounded-md px-3 py-2 text-sm ${
                    selectedCategory === group.id
                      ? "border border-gray-300 bg-white font-medium text-gray-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  onClick={() => setSelectedCategory(group.id)}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {selectedGroup.layers.map((layer) => {
              if (layer.yearKey) {
                const selection = lulcSelections[layer.yearKey];
                return (
                  <LulcSelector
                    key={layer.id}
                    layer={layer}
                    selection={selection.value}
                    setSelection={selection.setter}
                    isLoading={isLoading}
                  />
                );
              }

              return (
                <LayerItem
                  key={layer.id}
                  layer={layer}
                  isSelected={Boolean(toggledLayers?.[layer.name])}
                  onToggle={handleToggleClick}
                  isLoading={isLoading}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default RightSidebar;
