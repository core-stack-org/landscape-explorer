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
    const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem("accessToken"));
    const [isProjectsLoading, setIsProjectsLoading] = useState(false);
    const [projectsEmpty, setProjectsEmpty] = useState(false);
    const [isOpeningDashboard, setIsOpeningDashboard] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(()=>{
        const loadOrganization = async()=>{
        try{
            const orgData = await fetch (`${process.env.REACT_APP_API_URL}/auth/register/available_organizations/?app_type=plantation`);
            const orgResult = await orgData.json();
            if (!orgData.ok || !Array.isArray(orgResult)) {
                console.warn("Organizations API error or non-array:", orgData.status, orgResult);
                return;
            }
            const options = orgResult.filter(org=>org.name && org.id).map((org=>({
                label: org.name,
                value: org.id,
            })));
            setOrganizationOptions(options);
            }
        catch(error){
            console.warn("Not loading org (check REACT_APP_API_URL and network/CORS):", error);
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
            if (!respone.ok || !data?.access) {
                console.warn("Login failed:", respone.status, data);
                setAccessToken(null);
                sessionStorage.removeItem("accessToken");
                return null;
            }
            sessionStorage.setItem("accessToken",data.access);
            setAccessToken(data.access);
            return data.access;
        }
        catch(error){
            console.warn("Error in fetching token",error)
            setAccessToken(null);
        }
    };

    useEffect(()=>{
        if(!organization?.value){
            setProject(null);
            setProjectOptions([]);
            setProjectsEmpty(false);
            setIsProjectsLoading(false);
            return;
        };
        setProject(null);
        loadProjects(organization?.value);
    },[organization, accessToken]);

    const handleNavigate =()=>{
        if (!project?.value) return;
        setIsOpeningDashboard(true);
        const params  = new URLSearchParams(location.search);
        params.set("projectId", project.value);
        navigate(
            {
                pathname:location.pathname,
                search:params.toString(),
            }
        );
        setShowPlantationSites(true);
        // allow UI to show a short loading feedback even if route is fast
        setTimeout(() => setIsOpeningDashboard(false), 600);
    };

    const loadProjects = async(orgId)=>{
        if (!orgId) {
            setProjectOptions([]);
            setProjectsEmpty(false);
            return;
        }
        let token = accessToken || sessionStorage.getItem("accessToken");
        if (!token) {
            token = await fetchToken();
            if (!token) {
                console.warn("No access token: set REACT_APP_WATERBODYREJ_USERNAME and REACT_APP_WATERBODYREJ_PASSWORD in .env and restart the dev server.");
                setProjectOptions([]);
                setProjectsEmpty(false);
                return;
            }
        }
        try {
            setIsProjectsLoading(true);
            setProjectsEmpty(false);
            const projects = await fetch (`${process.env.REACT_APP_API_URL}/projects`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            const projectResult = await projects.json();
            if (!projects.ok) {
                console.warn("Projects API error:", projects.status, projectResult);
                setProjectOptions([]);
                setProjectsEmpty(false);
                setIsProjectsLoading(false);
                return;
            }
            if (!Array.isArray(projectResult)) {
                setProjectOptions([]);
                setProjectsEmpty(false);
                setIsProjectsLoading(false);
                return;
            }
            const orgIdNum = Number(orgId);
            const options = projectResult
                .filter((p)=> Number(p.organization) === orgIdNum)
                .map((p)=>({
                label: p.name,
                value: p.id,
            }));
            setProjectOptions(options);
            setProjectsEmpty(options.length === 0);
            setIsProjectsLoading(false);
        } catch(error) {
            console.warn("Error while loading projects (check API and network):", error);
            setProjectOptions([]);
            setProjectsEmpty(false);
            setIsProjectsLoading(false);
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
                            <p className="text-xs text-gray-500 text-center -mt-4 mb-6">
                                Choose an organization and project to view plantation sites.
                            </p>
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
                                {!organization?.value && (
                                    <p className="mt-2 text-xs text-gray-500">
                                        Select an organization first.
                                    </p>
                                )}
                                {!!organization?.value && isProjectsLoading && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                        <span className="inline-block h-3 w-3 rounded-full border-2 border-gray-300 border-t-purple-600 animate-spin" />
                                        Loading projects…
                                    </div>
                                )}
                                {!!organization?.value && !isProjectsLoading && projectsEmpty && (
                                    <p className="mt-2 text-xs text-gray-500">
                                        No projects found for this organization.
                                    </p>
                                )}
                        </div>
                        <div>
                            <button
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleNavigate}
                                disabled={!organization?.value || !project?.value || isOpeningDashboard}
                                title={
                                    !organization?.value
                                        ? "Select an organization first"
                                        : !project?.value
                                        ? "Select a project to continue"
                                        : undefined
                                }
                            >
                                {isOpeningDashboard ? "Opening dashboard…" : "Show Plantation sites"}
                            </button>
                            {(!organization?.value || !project?.value) && (
                                <p className="mt-2 text-xs text-gray-500 text-center">
                                    {!organization?.value
                                        ? "Select an organization to continue."
                                        : "Select a project to continue."}
                                </p>
                            )}
                        </div>
                        {process.env.NODE_ENV === "development" && organizationOptions.length === 0 && (
                            <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded p-2">
                                Dropdowns empty? Set <code className="bg-amber-100 px-1">REACT_APP_API_URL</code>, <code className="bg-amber-100 px-1">REACT_APP_WATERBODYREJ_USERNAME</code> and <code className="bg-amber-100 px-1">REACT_APP_WATERBODYREJ_PASSWORD</code> in <code className="bg-amber-100 px-1">.env</code> (same as production), then restart <code className="bg-amber-100 px-1">npm start</code>.
                            </p>
                        )}
                    </div>
                </div>
            </div>
                </div>
                ):(<PlantationProjectDashboard organization={organization} project={project}/>)}
                    
            </div>
        );
}

export default AgroHorticulture;