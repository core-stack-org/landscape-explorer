import React ,{useEffect, useState}from "react";
import { useNavigate,useLocation } from "react-router";
import LandingNavbar from "../components/landing_navbar";
import SelectButton from "../components/buttons/select_button";
import Waterbodies from "../assets/water.jpeg";
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
    const ORG_DASHBOARD_URL =  process.env.REACT_APP_ORG_DASHBOARD_URL;


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
        const url = `${location.pathname}?${params.toString()}`;

        window.open(url, "_blank"); 
        // navigate(
        //     {
        //         pathname:location.pathname,
        //         search:params.toString(),
        //     }
        // );
        // setShowWaterbodies(true);
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
                const options = projectResult.filter((p)=>p.organization==orgId && p.app_type === "waterbody").map((p)=>({
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
                    <div className="relative w-full flex items-center min-h-[calc(98vh-64px)] px-6 lg:px-20 overflow-hidden">
                    <div className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${Waterbodies})`, opacity: 0.3 }}/>
                    <div className="absolute inset-0 bg-white/10"></div>
                    <div className="relative z-10 w-full max-w-7xl mx-auto bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/30 p-10 flex gap-10 min-h-[450px]">
                        <div className="flex-1">
                        <h2 className=" text-3xl md:text-4xl text-purple-700 leading-tight mb-4">
                        <b>Waterbody Rejuvenation</b> <br/>Impact Assessment Dashboard
                        </h2>

                        <div className="rounded-md text-gray-700 mt-10 space-y-6 text-xl md:text-lg">
                            <ul className="list-disc list-outside  space-y-8 font-medium text-justify">
                                <li>Track <b>Waterbody Rejuvenation Interventions</b> and their impact on water availability
                                and agriculture in nearby areas.</li>
                                <li className="mt-4">To get started, select your <b>organization</b> and <b>project</b> . </li>
                            </ul>
                        </div>
                        </div>
                        <div className="w-[640px] bg-white rounded-2xl shadow-xl p-8">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-10 text-center">
                                Select Project
                            </h2>
                            <div className="space-y-8">

{/* ORGANIZATION */}
<div>
  <label className="block text-sm font-semibold text-gray-700 mb-2">
    Select Organization
  </label>

  <div className="flex items-center gap-4">
    <div className="flex-1">
      <SelectButton
        stateData={organizationOptions}
        currVal={organization}
        setState={setOrganization}
        handleItemSelect={(setState, e) => setState(e)}
        isClearable={true}
      />
    </div>

    <button
  disabled={!organization}
  className={`
    w-[190px]
    text-white font-medium
    py-2 rounded-xl
    whitespace-nowrap transition-colors
    flex items-center justify-center

    ${
      organization
        ? "bg-purple-600 hover:bg-purple-700 cursor-pointer"
        : "bg-gray-300 cursor-not-allowed"
    }
  `}
  onClick={() => {
    if (!organization) return;
    window.open("/dashboard/waterbody", "_blank");

    // navigate("/dashboard/waterbody");
  }}
>
  Org Dashboard
</button>
  </div>
</div>


{/* PROJECT */}
<div>
  <label className="block text-sm font-semibold text-gray-700 mb-2">
    Select Project
  </label>

  <div className="flex items-center gap-3">
    <div className="flex-1">
      <SelectButton
        stateData={organization?.value ? projectOptions : null}
        currVal={project}
        setState={setProject}
        handleItemSelect={(setState, e) => setState(e)}
        isClearable={true}
      />
    </div>

    <button
  disabled={!project}
  className={`
    w-[190px]
    text-white font-medium
    py-2 rounded-xl
    whitespace-nowrap transition-colors
    flex items-center justify-center

    ${
      project
        ? "bg-purple-600 hover:bg-purple-700 cursor-pointer"
        : "bg-gray-300 cursor-not-allowed"
    }
  `}
  onClick={() => {
    if (!project) return;
    handleNavigate();
  }}
>
  Project Dashboard
</button>
  </div>
</div>

                        </div>  
                </div>
            </div>
                </div>
                ):(<WaterProjectDashboard organization={organization} project={project}/>)}
                    
                    
                    </div>
        );
}

export default RWBDashboard;