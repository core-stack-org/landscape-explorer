import { ArrowLeft } from 'lucide-react';
import { stateAtom, districtAtom, blockAtom, dataJsonAtom } from '../store/locationStore.jsx';
import { useRecoilValue } from 'recoil';
import { useEffect, useState } from 'react';
import { trackEvent } from "../services/analytics.js"

const KYLMWSProfilePanel = ({ mwsData, onBack, hideBackButton = false }) => {
  const state = useRecoilValue(stateAtom);
  const district = useRecoilValue(districtAtom);
  const block = useRecoilValue(blockAtom);
  const dataJson = useRecoilValue(dataJsonAtom)

  const [dataString, setDataString] = useState("")

  const handleReportDownload = (id) => {
    trackEvent("Generate MWS Report", "generate_report", JSON.stringify([state.label, district.label, block.label, id]));
    window.open(`${process.env.REACT_APP_API_URL}/generate_mws_report/?state=${state.label.toLowerCase().replace(/\s*\(\s*/g, '_').replace(/\s*\)\s*/g, '').replace(/\s+/g, '_')}&district=${district.label.toLowerCase().replace(/\s*\(\s*/g, '_').replace(/\s*\)\s*/g, '').replace(/\s+/g, '_')}&block=${block.label.toLowerCase().replace(/\s*\(\s*/g, '_').replace(/\s*\)\s*/g, '').replace(/\s+/g, '_')}&uid=${id}`, '_blank');
  }

  useEffect(() => {
    if (dataJson !== null) {
      const found = dataJson.find((item) => item.mws_id === mwsData?.uid)
      try {
        const terrainType = ["Broad Slopes and Hilly", "Mostly Plains", "Hills and Valleys", "Broad Slopes and Plains"]
        
        let dataStr = `The Selected MWS has a Terrain of type ${terrainType[found.terrainCluster_ID]}, intersecting with ${found.mws_intersect_villages.length} villages also having ${found.total_nrega_assets} NREGA assets which lies in the selected MWS. The average cropping intensity across the MWS's is ${found.cropping_intensity_avg.toFixed(2)} with an ${Math.round(found.avg_precipitation)} mm average precipitation.`

        setDataString(dataStr)
      } catch (err) {
        console.log(err)
        console.log(found)
      }
    }
  }, [dataJson, mwsData])

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
          <h2 className="text-lg font-medium">Micro watershed profile</h2>
        </div>
      )}
      
      {hideBackButton && (
        <h2 className="text-lg font-medium mb-4">Micro watershed profile</h2>
      )}

      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-600">
          Micro watershed Id: {mwsData?.uid || '--'}
        </p>
      </div>

      <div className="mb-4">
        <h3 className="font-medium mb-2">Overview</h3>
        <p className="text-sm text-gray-600">
          {dataString}
        </p>
        <p className="text-sm text-gray-600 mt-2"> Read report for more details.</p>
      </div>

      <button className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-2" onClick={() => handleReportDownload(mwsData?.uid)}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span className="text-sm">View Micro-Watershed Profile </span>
      </button>
    </div>
  );
};

export default KYLMWSProfilePanel;