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

    useEffect(()=>{
        const params= new URLSearchParams(location.search);
        if(params.get("projectId")){
            setShowPlantationSites(true);
        }
    },[]);

        return (
            <div className="bg-slate-100">
                <LandingNavbar />
                {!showPlantationSites?(
                    <div className="relative min-h-screen w-full flex items-center px-20">
                    <div className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${Plantation})`, opacity: 0.3 }}/>
                    <div className="absolute inset-0 bg-white/10"></div>
                    <div className="relative z-10 w-full max-w-8xl mx-auto bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/30 p-10 flex gap-10 min-h-[450px]">
                        <div className="flex-1">
                        <h2 className="text-2xl md:text-4xl mb-4 text-purple-700">
                            <span className="font-bold">Track and Assess </span>
                            <span className="font-normal">NRM interventions</span>
                        </h2>
                        <div className="rounded-md text-gray-700">
                            <ul className="list-disc list-outside ml-5 text-black text-base md:text-lg space-y-6 font-medium text-justify leading-relaxed break-words max-w-4xl">
                                <li>
                                Agroforestry practitioners can assess the health of tree plantations over
                                time using the <b>Plantation Health Assessment Dashboard</b>.
                                </li>
                                <li>
                                Track the <b>health and growth of plantations</b> across time using
                                satellite-based monitoring.
                                </li>
                                <li>
                                A tool for monitoring health of the plantation sites, select the
                                <b>organization and project</b> to view.
                                </li>
                            </ul>
                        </div>
                        <div className="bg-purple-50 border-l-4 border-purple-500 text-purple-700 p-4 rounded-md mt-8 max-w-3xl">
                            <p className="text-sm">
                            Check out the vision and demo{" "}
                            <a
                                href="https://core-stack.org/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline font-medium hover:text-purple-900"
                            >
                                here →
                            </a>
                            </p>
                        </div>

                        </div>
                        <div className="w-[420px] bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-6 text-center">
                                Select Project
                            </h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    
            <Footer />
            </div>
        );
}

export default AgroHorticulture;