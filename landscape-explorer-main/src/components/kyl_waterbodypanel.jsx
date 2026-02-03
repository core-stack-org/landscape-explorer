import { ArrowLeft } from 'lucide-react';

const KYLWaterbodyPanel = ({ waterbody, onBack, hideBackButton = false }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3">
      {!hideBackButton && (
        <div className="flex items-center gap-2 mb-4">
          <button 
            onClick={onBack}
            className="hover:bg-gray-100 p-1 rounded-full"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-medium">Waterbody profile</h2>
        </div>
      )}

      {hideBackButton && (
        <h2 className="text-lg font-medium mb-4">Waterbody profile</h2>
      )}
      
      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-600 break-words">
          Waterbody Id: {waterbody?.id || '--'}
        </p>
        <p className="text-sm text-gray-600">
          This waterbody extends over {Number(waterbody?.properties?.area_ored)?.toFixed(2)} hectares
          and is situated {waterbody?.properties?.on_drainage_line === 1 ? "on" : "off"} the drainage line,
          belonging to stream order {waterbody?.properties?.max_stream_order}.
        </p>
      </div>
      <button className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-2" onClick={() => window.open(waterbody?.dashboardUrl, "_blank")}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span className="text-sm">View Waterbody Profile </span>
      </button>
    </div>
  );
};

export default KYLWaterbodyPanel;