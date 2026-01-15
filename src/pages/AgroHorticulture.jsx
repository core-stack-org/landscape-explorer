import React ,{useEffect, useState}from "react";
import { useNavigate,useLocation } from "react-router";
import LandingNavbar from "../components/landing_navbar";
import SelectButton from "../components/buttons/select_button";
import Plantation from "../assets/plantation.png";
import Footer from "../components/footer";
import PlantationProjectDashboard from "../components/plantation_project_dashboard";

const AgroHorticulture =()=>{
    const [organizationOptions,setOrganizationOptions] = useState([]);
    const [organization, setOrganization] = useState(null);
    const [projectOptions, setProjectOptions] = useState([]);
    const [project, setProject] = useState(null);
    const [showPlantationSites, setShowPlantationSites] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(()=>{
        const loadOrganization = async()=>{
        try{
            const orgData = await fetch (`${process.env.REACT_APP_API_URL}/auth/register/available_organizations/?app_type=plantation`);
                const orgResult = await orgData.json();
                const options = orgResult.filter(org=>org.name && org.id).map((org=>({
                    label: org.name,
                    value: org.id,
                })))
                setOrganizationOptions(options)
            }
        catch(error){
            console.warn("Not loading org",error)
        }
    }       
        loadOrganization();
    }
    ,[]);

    useEffect(()=>{
        fetchToken();
    },[]);

    const fetchToken = async () =>{
        try{
            const respone = await fetch (`${process.env.REACT_APP_API_URL}/auth/login/`,
                {
                    method:"POST",
                    headers:{"content-type":"application/JSON"},
                    body:JSON.stringify({
                        username:process.env.REACT_APP_WATERBODYREJ_USERNAME,
                        password:process.env.REACT_APP_WATERBODYREJ_PASSWORD,
                    })
                },
            )
            const data = await respone.json();
            sessionStorage.setItem("accessToken",data.access);
            return data.access;
        }
        catch(error){
            console.warn("Error in fetching token",error)
        }
    };

    useEffect(()=>{
        if(!organization?.value){
            setProject(null);
            setProjectOptions([]);
        };
        setProject(null);
        loadProjects(organization?.value);
    },[organization]);

    const handleNavigate =()=>{
        if(!organization && !project) return;
        const params  = new URLSearchParams(location.search);
        params.set("projectId",project.value)
        navigate(
            {
                pathname:location.pathname,
                search:params.toString(),
            }
        );
        setShowPlantationSites(true);
    };

    const loadProjects = async(orgId)=>{
        let token = sessionStorage.getItem("accessToken")
            try{
                const projects = await fetch (`${process.env.REACT_APP_API_URL}/projects`,
                    {
                    headers:{
                        Authorization:`Bearer ${token}`,
                        "Content-Type": "application/json",
                    }
                }
                );
                const projectResult = await projects.json();
                const options = projectResult.filter((p)=>p.organization==orgId).map((p)=>({
                    label:p.name,
                    value:p.id
                }));
                setProjectOptions(options);
            }
            catch(error){
                console.warn("Error while loading projects",error);
            }
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (!params.get("projectId")) {
          setShowPlantationSites(false);
          setProject(null);
        }
      }, [location.search]);
      

        return (
            <div className="bg-slate-100">
                <LandingNavbar />
                {!showPlantationSites?(
                    <div className="relative w-full flex items-center min-h-[calc(98vh-64px)] px-6 lg:px-20 overflow-hidden">
                    <div className="absolute inset-0 bg-cover bg-center overflow-hidden"
                        style={{ backgroundImage: `url(${Plantation})`, opacity: 0.3 }}/>
                    <div className="absolute inset-0 bg-white/10"></div>
                    <div className="relative z-10 w-full max-w-7xl mx-auto bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/30 p-10 flex gap-10 min-h-[350px] md:min-h-[450px]">
                        <div className="flex-1">
                        <h2 className=" text-3xl md:text-4xl text-purple-700 leading-tight mb-4">
                        Plantation<br /> Impact Assessment Dashboard
                        </h2>

                        <div className="rounded-md text-gray-700 mt-10 space-y-6 text-xl md:text-lg">
                            <ul className="list-disc list-outside  space-y-8 font-medium text-justify">
                                <li>A dashboard for <b>Agrohorticulture practitioners</b> to assess the health
                                of tree plantations over time using satellite-based monitoring</li>
                                <li className="mt-4">To get started, simply select your <b>organization</b> and <b>project</b> . </li>
                            </ul>
                        </div>
                        </div>
                        <div className="w-[420px] bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-6 text-center">
                                Select Project
                            </h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Select Organization
                                </label>
                                <SelectButton
                                stateData={organizationOptions}
                                currVal={organization}
                                setState={setOrganization}
                                handleItemSelect={(setState, e) => setState(e)}
                                />
                            </div>
                        <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Select Project
                                </label>
                                <SelectButton
                                stateData={organization?.value ? projectOptions : null}
                                currVal={project}
                                setState={setProject}
                                handleItemSelect={(setState, e) => setState(e)}
                                />
                        </div>
                        <button className="bg-purple-600 text-white px-4 py-2 rounded-lg w-full"
                        onClick={handleNavigate}>
                            Show Plantation sites
                        </button>
                    </div>
                </div>
            </div>
                </div>
                ):(<PlantationProjectDashboard organization={organization} project={project}/>)}
                    
            </div>
        );
}

export default AgroHorticulture;