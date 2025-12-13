import React from "react";
import {
  Box,
  Avatar,
  Typography,
  Card,
  CardContent,
  Divider,
  Grid,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

const StewardDetailPage = () => {
  // Hardcoded data
  const steward = {
    photo: "",
    name: "Radha Grag",
    experience: "5 Years",
    organization: "CFPT",
    age: 32 ,
    gender: "Female",
    Education:"Graduate",
    State:"Uttar Pradesh",
    approvedDocs: 10,
    totalPlans: 3,
    dprGenerated: 2,
    plans: [
      { name: "Plantation Plan", status: "Completed", demandsApproved: 3 },
      { name: "Status Report", status: "In Progress", demandsApproved: 1 },
      { name: "Improvement Plan", status: "Completed", demandsApproved: 2 },
    ],
  };

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
              src={steward.photo}
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
              {steward.name}
            </Typography>


            <Typography sx={{ mb: 1 }}>
              <strong>Organization:</strong> {steward.organization}
            </Typography>

            <Typography sx={{ mb: 1 }}>
              <strong>Age:</strong> {steward.age}
            </Typography>

            <Typography sx={{ mb: 1 }}>
              <strong>Gender:</strong> {steward.gender}
            </Typography>

            <Typography sx={{ mb: 1 }}>
              <strong>Education Qualification:</strong> {steward.Education}
            </Typography>

            <Typography sx={{ mb: 1 }}>
              <strong>Years of Experience:</strong> {steward.experience}
            </Typography>

            <Typography sx={{ mb: 1 }}>
              <strong>State:</strong> {steward.State}
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
                {steward.totalPlans}
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
                {steward.dprGenerated}
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
                <TableCell sx={{ fontWeight: 700 }}>
                  No. of Demands Approved
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {steward.plans.map((plan, index) => (
                <TableRow key={index}>
                  <TableCell>{plan.name}</TableCell>
                  <TableCell>{plan.status}</TableCell>
                  <TableCell>{plan.demandsApproved}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default StewardDetailPage;
