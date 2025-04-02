import { useEffect } from "react";
import { useNavigate } from "react-router";

import { useRecoilState } from 'recoil';
import { stateDataAtom, stateAtom, districtAtom, blockAtom } from '../store/locationStore';
import SelectButton from '../components/buttons/select_button.jsx';
import landingPageBg from '../assets/landingpagebg.svg';
import Navbar from '../components/navbar.jsx';
import getStates from "../actions/getStates";
import { trackPageView, trackEvent, initializeAnalytics } from "../services/analytics";

const LandingPage = () => {
    const navigate = useNavigate();

    //? States for Populating and handling the selections for location
    const [statesData, setStatesData] = useRecoilState(stateDataAtom);
    const [state, setState] = useRecoilState(stateAtom);
    const [district, setDistrict] = useRecoilState(districtAtom);
    const [block, setBlock] = useRecoilState(blockAtom);
  
    const handleItemSelect = (setter, value) => {
      // Track selection events with Google Analytics
      if (setter === setState && value) {
        trackEvent('Location', 'select_state', value.label);
      } else if (setter === setDistrict && value) {
        trackEvent('Location', 'select_district', value.label);
      } else if (setter === setBlock && value) {
        trackEvent('Location', 'select_block', value.label);
      }
      
      setter(value);
    };

    const handleNavigate = (path, buttonName) => {
      // Track navigation events
      trackEvent('Navigation', 'button_click', buttonName);
      navigate(path);
    };

    const getStatesData = async () => {
      let data = await getStates();
      setStatesData(data);
    };

    useEffect(() => {
      // Initialize Google Analytics
      initializeAnalytics();
      
      // Track page view when component mounts
      trackPageView('/');
      
      // Load states data
      getStatesData();
    }, []);
    
    return (
      <div className="h-screen flex flex-col">
        <Navbar />
        
        <div className="flex-1 relative">
        {/* Main content wrapper with 75% purple bg */}
        <div className="h-full flex">
          <div className="w-3/4 relative">
            {/* Background image container */}
            <div className="absolute inset-0">
              <div 
                className="h-full bg-no-repeat bg-cover opacity-60" 
                style={{ backgroundImage: `url(${landingPageBg})` }}
              />
            </div>
          </div>
          <div className="w-1/4 bg-white"></div>
        </div>
          
          <div className="absolute inset-0 font-montserrat">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex pt-8">
                {/* Left Section */}
                <div className="w-[55%] pr-4">
                  <h1 className="text-[48px] font-semibold text-gray-900 mb-10 mt-5">
                    Know, Plan, Assess
                  </h1>
                  <p className="text-[17px] leading-relaxed text-gray-800 mb-12 max-w-[560px]">
                    A complete technology stack to enable bottom-up planning, execution, and
                    monitoring of watershed interventions.
                  </p>
                </div>
  
                {/* Right Section */}
                <div className="w-[45%] mt-10 font-montserrat">
                  <div className="bg-neutral-100 rounded-lg shadow-sm p-14 max-w-[500px]">
                    <div className="space-y-5">
                      <div>
                        <SelectButton
                          currVal={state || { label: "Select State" }}
                          stateData={statesData}
                          handleItemSelect={handleItemSelect}
                          setState={setState}
                        />
                      </div>
  
                      <div>
                        <SelectButton
                          currVal={district || { label: "Select District" }}
                          stateData={state !== null ? state.district : null}
                          handleItemSelect={handleItemSelect}
                          setState={setDistrict}
                        />
                      </div>
  
                      <div>
                        <SelectButton
                          currVal={block || { label: "Select Block" }}
                          stateData={district !== null ? district.blocks : null}
                          handleItemSelect={handleItemSelect}
                          setState={setBlock}
                        />
                      </div>
                    </div>
  
                    <div className="mt-8 flex gap-3">
                      <button 
                        className="bg-[#8B5CF6] text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-[#7C3AED] transition-colors"
                        onClick={() => handleNavigate("/kyl_dashboard", "Know Your Landscape")}
                      >
                        Know Your Landscape
                      </button>
                      <button 
                        className="bg-[#EDE9FE] text-[#8B5CF6] px-6 py-2.5 rounded-md text-sm font-medium hover:bg-[#DDD6FE] transition-colors"
                        onClick={() => handleNavigate("/landscape_explorer", "Download Layers")}
                      >
                        Download Layers
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  export default LandingPage;