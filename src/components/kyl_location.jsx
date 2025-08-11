import { useState, useEffect, useRef, useCallback } from "react";
import { Search } from "lucide-react";
import { useRecoilState } from "recoil";
import { Map, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { stateAtom, districtAtom, blockAtom } from "../store/locationStore";
import { toast } from "react-hot-toast";

const KYLLocationSearchBar = ({ statesData, onLocationSelect, setSearchLatLong }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [predictionResults, setPredictionResults] = useState([]);
  const [placesService, setPlacesService] = useState(null);
  const [autocompleteService, setAutocompleteService] = useState(null);
  const [sessionToken, setSessionToken] = useState();
  const wrapperRef = useRef(null);
  const gmap = useMap();
  const places = useMapsLibrary("places");

  // Recoil state
  const [state, setState] = useRecoilState(stateAtom);
  const [district, setDistrict] = useRecoilState(districtAtom);
  const [block, setBlock] = useRecoilState(blockAtom);

  // Process statesData to create a flat array of searchable locations
  const getAllLocations = () => {
    if (!statesData) return [];

    const locations = [];

    statesData.forEach((state) => {
      // Add state
      locations.push({
        id: `state-${state.state_id}`,
        name: state.label,
        type: "state",
        data: state,
      });

      // Add districts
      state.district?.forEach((district) => {
        locations.push({
          id: `district-${district.district_id}`,
          name: `${district.label}, ${state.label}`,
          type: "district",
          data: {
            state: state,
            district: district,
          },
        });

        // Add blocks
        district.blocks?.forEach((block) => {
          locations.push({
            id: `block-${block.block_id}`,
            name: `${block.label}, ${district.label}, ${state.label}`,
            type: "block",
            data: {
              state: state,
              district: district,
              block: block,
            },
          });
        });
      });
    });

    return locations;
  };

  useEffect(() => {
    if (!places) {
      console.log("Places not available");
    }
    if (!gmap) {
      console.log("map not available");
    }

    if (!places || !gmap) return;

    setAutocompleteService(new places.AutocompleteService());
    setPlacesService(new places.PlacesService(gmap));
    setSessionToken(new places.AutocompleteSessionToken());

    return () => setAutocompleteService(null);
  }, [gmap, places]);

  // Filter locations based on search query
  const getFilteredLocations = (query) => {
    if (!query) return [];

    const locations = getAllLocations();
    const normalizedQuery = query.toLowerCase();

    return locations
      .filter((location) =>
        location.name.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 5); // Limit to 5 suggestions
  };

  const fetchPredictions = useCallback(
    async (inputValue) => {
      if (!autocompleteService || !inputValue) {
        setPredictionResults([]);
        return;
      }

      const request = { input: inputValue, sessionToken };
      const response = await autocompleteService.getPlacePredictions(request);

      setPredictionResults(response.predictions);
    },
    [autocompleteService, sessionToken]
  );

  const onInputChange = useCallback(
    (event) => {
      const value = event.target?.value;

      setSearchQuery(value);
      fetchPredictions(value);
    },
    [fetchPredictions]
  );

  // Update location state based on selection
  const updateLocationState = (location) => {
    switch (location.type) {
      case "state":
        setState(location.data);
        setDistrict(null);
        setBlock(null);
        break;
      case "district":
        setState(location.data.state);
        setDistrict(location.data.district);
        setBlock(null);
        break;
      case "block":
        setState(location.data.state);
        setDistrict(location.data.district);
        setBlock(location.data.block);
        break;
      default:
        break;
    }

    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  // Handle location selection
  const handleLocationSelect = (location) => {
    setSearchQuery(location.name.split(",")[0]); // Only show the immediate location name
    setIsOpen(false);
    updateLocationState(location);
  };

  const handleGooglePlaceSelect = (prediction) => {
    let placeName = prediction.description;
    if (placeName) {
      const locationParts = placeName.split(", ");
      if (locationParts.length > 1) {
        locationParts.pop(); // Remove the last element (country name)
      }
      placeName = locationParts.join(", ");
    }

    setSearchQuery(placeName);
    setIsOpen(false);

    const parts = placeName.split(", ");
    const stateName = parts.length > 0 ? parts[parts.length - 1].trim() : null;

    // === Step 1: Find the Best Matching State ===
    const matchedState = statesData.find(
      (s) => s.label.trim().toLowerCase() === stateName.toLowerCase()
    );

    if (!matchedState) {
      toast.custom(
        (t) => (
          <div className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Location Request
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                  We have not generated maps for this location as yet. Would you like to submit a request?
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => {
                  window.open('https://forms.gle/qBkYmmU7AhyKnc4N9', '_blank');
                  toast.dismiss(t.id);
                }}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
              >
                Submit Request
              </button>
            </div>
          </div>
        ),
        {
          duration: 5000,
          position: 'top-right',
        }
      );
      return;
    }

    // === Step 2: Get Districts and Blocks from the Matched State ===
    const districtNames = matchedState.district.map((d) =>
      d.label.trim().toLowerCase()
    );

    const blockNames = matchedState.district.flatMap((d) =>
      d.blocks ? d.blocks.map((b) => b.label.trim().toLowerCase()) : []
    );

    // === Step 3: Check for District or Block in Place Name ===
    let matchedDistrict = null;
    let districtName = null;

    for (let i = parts.length - 2; i >= 0; i--) {
      const cleanPart = parts[i].trim().toLowerCase();

      if (districtNames.includes(cleanPart)) {
        districtName = cleanPart;
        matchedDistrict = matchedState.district.find(
          (d) => d.label.trim().toLowerCase() === districtName
        );
        break;
      }

      // Check if the District is Contained Within the Part
      const foundDistrict = districtNames.find((d) => cleanPart.includes(d));
      if (foundDistrict) {
        districtName = foundDistrict;
        matchedDistrict = matchedState.district.find(
          (d) => d.label.trim().toLowerCase() === districtName
        );
        break;
      }
    }

    let matchedBlock = null;
    let blockName = null;

    for (let i = parts.length - 2; i >= 0; i--) {
      const cleanPart = parts[i].trim().toLowerCase();

      matchedBlock = matchedState.district
        .flatMap((d) => d.blocks || [])
        .find((b) => b.label.trim().toLowerCase() === cleanPart);

      if (matchedBlock) {
        blockName = matchedBlock.label.trim().toLowerCase();
        break;
      }

      // Check if Block Name is Part of the Address
      const foundBlock = blockNames.find((b) => cleanPart.includes(b));

      if (foundBlock) {
        blockName = foundBlock;
        matchedBlock = matchedState.district
          .flatMap((d) => d.blocks || [])
          .find((b) => b.label.trim().toLowerCase() === blockName);

        if (matchedBlock) {
          break;
        }
      }
    }
    // === Step 5: Final Assignment ===
    setState(matchedState);
    setDistrict(matchedDistrict);
    setBlock(matchedBlock);

    if (placesService) {
      placesService.getDetails(
        { placeId: prediction.place_id , fields: ["geometry", "name", "address_component"], sessionToken},
        (place, status) => {
          if (status === "OK" && place) {
            
            const loc = place.geometry?.location;
            const {lat , lng} = loc ? loc.toJSON() : {lat : null, lng : null}
            setSearchLatLong([lat, lng])
            
            if (onLocationSelect) {
              onLocationSelect({
                state: matchedState,
                district: matchedDistrict,
                block: matchedBlock,
              });
            }
          }
        }
      );
    }
  };

  useEffect(() => {
    if (block) {
      setSearchQuery(block.label);
      // Get filtered locations based on current block name
      setSuggestions(getFilteredLocations(block.label));
      setIsOpen(false);
    } else if (district) {
      setSearchQuery(district.label);
      setSuggestions(getFilteredLocations(district.label));
      setIsOpen(false);
    } else if (state) {
      setSearchQuery(state.label);
      setSuggestions(getFilteredLocations(state.label));
      setIsOpen(false);
    } else {
      setSearchQuery("");
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [block, district, state]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-[300px]">
      <Map
        style={{ display: "none", width: "20vw", height: "20vh" }}
        defaultCenter={{ lat: 22.54992, lng: 0 }}
        defaultZoom={3}
        gestureHandling={"greedy"}
        disableDefaultUI={true}
      />
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={onInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Search a particular location"
          className="w-full px-4 py-2.5 pr-10 rounded-md text-sm focus:outline-none border border-gray-200 bg-white shadow-sm"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Search className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {isOpen && (suggestions.length > 0 || predictionResults.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-[300px] overflow-y-auto z-50">
          {/* Show Local Suggestions */}
          {suggestions.map((location) => (
            <button
              key={location.id}
              onClick={() => handleLocationSelect(location)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              <div className="flex flex-col">
                <span className="text-sm text-gray-700 font-medium">
                  {location.name.split(",")[0]}
                </span>
                {location.type !== "state" && (
                  <span className="text-xs text-gray-400">
                    {location.name.split(",").slice(1).join(",")}
                  </span>
                )}
              </div>
            </button>
          ))}

          {/* Show Google Places Predictions */}
          {predictionResults.map((prediction) => (
            <button
              key={prediction.place_id}
              onClick={() => handleGooglePlaceSelect(prediction)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              <div className="flex flex-col">
                <span className="text-sm text-gray-700 font-medium">
                  {prediction.structured_formatting.main_text}
                </span>
                <span className="text-xs text-gray-400">
                  {prediction.structured_formatting.secondary_text}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default KYLLocationSearchBar;
