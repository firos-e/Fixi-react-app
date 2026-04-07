import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "../Pages/Homepage/Homepage";
import Login from "../Pages/Login/Login";
import Signup from "../Pages/SignUp/SignUp";
import Navbar from "../Components/Nabar/Navbar";
import ProtectedRoute from "./ProtectedRoute";
import UserDashboard from "../Pages/Dashboard/User_DashBoard/UserDashboard";
import TechDashboard from "../Pages/Dashboard/Techn_DashBoard/TechDashboard";

// ✅ placeholder dashboards for now
function MainRout() {
  return (
    <Router>
      <Navbar />
      <Routes>
        {/* public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* ✅ protected user dashboard */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRole="user">
            <UserDashboard />
          </ProtectedRoute>
        } />

        {/* ✅ protected technician dashboard */}
        <Route path="/technician/dashboard" element={
          <ProtectedRoute allowedRole="technician">
            <TechDashboard />
          </ProtectedRoute>
        } />

        {/* catch all → home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default MainRout;