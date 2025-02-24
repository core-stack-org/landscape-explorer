import { ArrowLeft } from 'lucide-react';

const KYLMWSProfilePanel = ({ mwsData, onBack }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3">
      <div className="flex items-center gap-2 mb-4">
        <button 
          onClick={onBack}
          className="hover:bg-gray-100 p-1 rounded-full"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-medium">Micro watershed profile</h2>
      </div>
      
      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-600">
          Micro watershed Id: {mwsData?.mws_id || '--'}
        </p>
        <p className="text-sm text-gray-600">
          Identified Patterns: Groundwater Stress, Drought Prone
        </p>
      </div>

      <div className="mb-4">
        <h3 className="font-medium mb-2">Overview</h3>
        <p className="text-sm text-gray-600">
          Lorem ipsum dolor sit amet consectetur. Eleifend sagittis quis eget 
          lacus quis. Non vestibulum consequat in sed in donec cursus. Tellus 
          facilisis neque nunc ultrices leo quis.
        </p>
      </div>

      <button className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span className="text-sm">Download Report</span>
      </button>
    </div>
  );
};

export default KYLMWSProfilePanel;