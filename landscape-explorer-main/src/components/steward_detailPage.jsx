import React,{useEffect,useState} from "react";
import {
  Box,
  Avatar,
  Typography,
  Card,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

const StewardDetailPage = ({ plan }) => {
  console.log(plan)
  const [stewardData, setStewardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!plan) return;

    const organizationId = plan.organization;   
    const username = plan.facilitator_name;              

    const getStewardDetails = async (organizationId, username) => {
      try {
        const url = `${process.env.REACT_APP_API_URL}/organizations/${organizationId}/watershed/plans/steward-details/?facilitator_name=${username}`;
    // const url = `https://2bb02f703cef.ngrok-free.app/api/v1/organizations/${organizationId}/watershed/plans/steward-details/?facilitator_name=${username}`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "420",
            "X-API-Key" : `${process.env.REACT_APP_API_KEY}`,
            // "X-API-KEY": "siOgP9SO.oUCc1vuWQRPkdjXjPmtIZYADe5eGl3FK",
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch steward details");
        }
        const data = await response.json();
        console.log(data)
        return data;
     
       
      } catch (error) {
        console.error("Steward Details API Error:", error);
        return null;
      }
    };
    

    const loadSteward = async () => {
      setLoading(true);
      const data = await getStewardDetails(organizationId, username);
      setStewardData(data);
      setLoading(false);
    };

    loadSteward();
  }, [plan]);
  
  if (loading) {
    return <Typography sx={{ p: 4 }}>Loading steward details...</Typography>;
  }
  
  if (!stewardData) {
    return <Typography sx={{ p: 4 }}>No steward data found</Typography>;
  }
  return (
    <Box sx={{ p: 1, mt: 1 }}>
      {/* ---------- MAIN CARD ---------- */}
      <Card
        elevation={3}
        sx={{
          maxWidth: 950,
          margin: "0 auto",
          borderRadius: 4,
          overflow: "hidden",
          p: 2,
        }}
      >
{/* ---------- BASIC DETAILS SECTION ---------- */}
<Box 
  sx={{ 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center",
    mb: 0 
  }}
>
  <Typography variant="h6" fontWeight={700} sx={{ color: "#334155" }}>
    Basic Details of Steward
  </Typography>

  {/* CLOSE BUTTON */}
  <Typography
    sx={{
      fontSize: "20px",
      fontWeight: "bold",
      cursor: "pointer",
      color: "#475569",
      "&:hover": { color: "#1e293b" }
    }}
    onClick={() => window.closeStewardModal?.()} 
  >
    ×
  </Typography>
</Box>


      <Card
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          background: "#fafafa",
          mb: 4,
        }}
      >
        <Grid container spacing={4}>
          
          {/* Avatar */}
          <Grid item xs={12} sm={3} textAlign="center">
          <Avatar
  src={stewardData.profile_picture || ""}
  sx={{
    width: 150,
    height: 150,
    margin: "0 auto",
    background: "#e2e8f0",
  }}
/>

          </Grid>

          {/* DETAILS - Vertical list */}
          <Grid item xs={12} sm={9}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
            {stewardData.facilitator_name}
            </Typography>


            <Typography sx={{ mb: 1 }}>
              <strong>Organization:</strong>   {stewardData.organization?.name || "N/A"}

            </Typography>

            <Typography sx={{ mb: 1 }}>
              <strong>Gender:</strong> {stewardData.gender || "N/A"}
            </Typography>

            <Typography sx={{ mb: 1 }}>
              <strong>Education Qualification:</strong>   {stewardData.education_qualification || "N/A"}

            </Typography>

            <Typography sx={{ mb: 1 }}>
              <strong>Years of Experience:</strong> {stewardData.experience || "N/A"}
            </Typography>

            <Typography sx={{ mb: 1 }}>
              <strong>State:</strong>   {stewardData.working_locations?.states?.[0]?.name || "N/A"}

            </Typography>
          </Grid>

        </Grid>
      </Card>

        {/* ---------- STEWARDSHIP DETAILS ---------- */}
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: "#334155" }}>
          Stewardship Details
        </Typography>

        {/* METRIC CARDS - 2 COLUMNS */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Total Plans */}
          <Grid item xs={12} sm={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                textAlign: "center",
              }}
            >
              <Typography fontWeight={600} sx={{ mb: 1 }}>
                No. of Plans Under This Steward
              </Typography>

              <Typography
                variant="h3"
                fontWeight={700}
                sx={{ color: "#2563eb" }}
              >
  {stewardData.statistics?.total_plans ?? 0}
  </Typography>
            </Paper>
          </Grid>

          {/* DPR Generated */}
          <Grid item xs={12} sm={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                textAlign: "center",
              }}
            >
              <Typography fontWeight={600} sx={{ mb: 1 }}>
                No. of DPR Generated
              </Typography>

              <Typography
                variant="h3"
                fontWeight={700}
                sx={{ color: "#4f46e5" }}
              >
  {stewardData.statistics?.dpr_completed ?? 0}
  </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* ---------- TABLE SECTION ---------- */}
        <Typography
          fontWeight={700}
          sx={{ mb: 1, mt: 2, color: "#334155", fontSize: "18px" }}
        >
          Plans Summary
        </Typography>

        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: "1px solid #e2e8f0", borderRadius: 2, mt: 1 }}
        >
          <Table>
            <TableHead sx={{ background: "#f1f5f9" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Plan Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                {/* <TableCell sx={{ fontWeight: 700 }}>
                  No. of Demands Approved
                </TableCell> */}
              </TableRow>
            </TableHead>

            <TableBody>
  {stewardData.plans?.length > 0 ? (
    stewardData.plans.map((p, index) => (
      <TableRow key={p.id || index}>
        <TableCell>{p.name}</TableCell>
        <TableCell>
  <Typography
    sx={{
      fontWeight: 600,
      color: p.is_completed ? "#16a34a" : "#dc2626", // green / red
    }}
  >
    {p.is_completed ? "Completed" : "Not Completed"}
  </Typography>
</TableCell>
        {/* <TableCell>--</TableCell> */}
      </TableRow>
    ))
  ) : (
    <TableRow>
      <TableCell colSpan={3} align="center">
        No plans available
      </TableCell>
    </TableRow>
  )}
</TableBody>

          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default StewardDetailPage;
