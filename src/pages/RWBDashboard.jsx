import React ,{useEffect, useState}from "react";
import { useNavigate,useLocation } from "react-router";
import LandingNavbar from "../components/landing_navbar";
import SelectButton from "../components/buttons/select_button";
import Waterbodies from "../assets/water.jpeg";
import Footer from "../components/footer";
import WaterProjectDashboard from "../components/water_project_dashboard";

const RWBDashboard =()=>{
    const [organizationOptions,setOrganizationOptions] = useState([]);
    const [organization, setOrganization] = useState(null);
    const [projectOptions, setProjectOptions] = useState([]);
    const [project, setProject] = useState(null);
    const [showWaterbodies, setShowWaterbodies] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const isTehsilMode = params.get("type") === "tehsil";


    useEffect(()=>{
        const loadOrganization = async()=>{
        try{
            const orgData = await fetch (`${process.env.REACT_APP_API_URL}/auth/register/available_organizations/?app_type=waterbody`);
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

    useEffect(() => {
        const params = new URLSearchParams(location.search);
          if (!params.get("projectId")) {
          setShowWaterbodies(false);
          setProject(null);
        }
      }, [location.search]);

      useEffect(() => {
        const params = new URLSearchParams(location.search);
      
        const type = params.get("type");
        const projectId = params.get("projectId");
        const projectName = params.get("project_name");
        const waterbody = params.get("waterbody");
      
        if (type && (projectId || waterbody)) {
          setShowWaterbodies(true);
        }
      }, [location.search]);
      
    const handleNavigate =()=>{
        if(!organization && !project) return;
        const params  = new URLSearchParams(location.search);
        params.set("type", "project");                 
        params.set("projectId", project.value);       
        params.set("project_name", project.label); 
        navigate(
            {
                pathname:location.pathname,
                search:params.toString(),
            }
        );
        setShowWaterbodies(true);
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

        return (
            <div className="bg-slate-100">
                    {!isTehsilMode && <LandingNavbar />}
                    {!showWaterbodies?(
                    <div className="relative min-h-screen w-full flex items-center px-20">
                    <div className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${Waterbodies})`, opacity: 0.3 }}/>
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
                                Track waterbody rejuvenation interventions and their impact on
                                cropping in nearby areas with the{" "}
                                <b>WaterBody Rejuvenation Assessment Dashboard</b>.
                                </li>
                                <li>
                                Visualize <b>waterbody interventions</b> and evaluate their effects on water availability and agriculture.
                                </li>
                                <li>
                                A tool for monitoring health of the waterbodies, select the
                                <b> organization and project</b> to view.
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
                            Show Waterbodies
                        </button>
                    </div>
                </div>
            </div>
                </div>
                ):(<WaterProjectDashboard organization={organization} project={project}/>)}
                    
                    {!isTehsilMode && <Footer />}
                    </div>
        );
}

export default RWBDashboard;