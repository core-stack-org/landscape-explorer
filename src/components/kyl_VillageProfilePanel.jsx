import { ArrowLeft } from 'lucide-react';
import { stateAtom, districtAtom, blockAtom } from '../store/locationStore.jsx';
import { useRecoilValue } from 'recoil';
import { trackEvent } from "../services/analytics.js";
import { Table } from "lucide-react";

const KYLVillageProfilePanel = ({
  villageData,
  onBack,
  hideBackButton = false,
  onOpenSelection,
  selectedVillages = [],
}) => {
  const state = useRecoilValue(stateAtom);
  const district = useRecoilValue(districtAtom);
  const block = useRecoilValue(blockAtom);

  const transformName = (name) => {
    if (!name) return name;
    return name
      .replace(/[()]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .toLowerCase()
  };

  const getVillageId = (v) => (v && typeof v === 'object' ? (v.vill_ID ?? v.village_id) : v);
  const getVillageName = (v) =>
    v && typeof v === 'object' ? (v.vill_name || v.village_name || v.name || 'Unknown') : v;

  const handleReportDownload = (villageId) => {
    trackEvent("Generate Village Report", "generate_report", JSON.stringify([state.label, district.label, block.label, villageId]));
    window.open(
      `${process.env.REACT_APP_API_URL}/generate_village_report/?state=${transformName(state.label)}&district=${transformName(district.label)}&block=${transformName(block.label)}&villageId=${villageId}`,
      '_blank'
    );
  };

  const villageId = getVillageId(villageData);
  const villageName = getVillageName(villageData);

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3">

      {!hideBackButton && (
        <div className="flex items-center gap-2 mb-4 mt-4">
          <button
            onClick={onBack}
            className="hover:bg-gray-100 p-1 rounded-full"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-medium">Village profile</h2>
        </div>
      )}

      {hideBackButton && (
        <h2 className="text-lg font-medium mb-4">Village profile</h2>
      )}

      {selectedVillages.length <= 1 ? (
        <>
          <div className="space-y-2 mb-4">
            <p className="text-sm text-gray-600">
              Village: {villageName || "--"}
            </p>
            <p className="text-sm text-gray-600">
              Village Id: {villageId ?? "--"}
            </p>
          </div>

          <button
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-2"
            onClick={() => handleReportDownload(villageId)}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span className="text-sm">View Village Report</span>
          </button>
        </>
      ) : (
        <div className="space-y-5">

          <div>
            <h3 className="font-medium text-gray-900 mb-2">
              Overview
            </h3>

            <p className="text-sm text-gray-600 leading-6">
              The selected <strong>{selectedVillages.length}</strong>{" "}
              villages are available for review.
              Click on any village below to open its detailed report.
            </p>
          </div>

          <hr />

          <div className="space-y-3 max-h-[320px] overflow-y-auto">
            {selectedVillages.map((vid, index) => (
              <div
                key={vid}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </div>
                  <p className="text-sm font-medium text-gray-800">{vid}</p>
                </div>

                <button
                  className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-2"
                  onClick={() => handleReportDownload(vid)}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span className="text-sm">View Profile</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {onOpenSelection && (
        <div className="flex justify-center mt-4">
          <button
            onClick={onOpenSelection}
            className="flex justify-center items-center gap-1 px-4 py-1.5 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
          >
            <Table className="w-3 h-3" />
            View Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default KYLVillageProfilePanel;
