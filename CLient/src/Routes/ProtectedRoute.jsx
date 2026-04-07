import React from "react";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (allowedRole && role !== allowedRole) {
    return <Navigate to={role === "technician" ? "/technician/dashboard" : "/dashboard"} />;
  }

  return children;
}

export default ProtectedRoute; // ✅ make sure this line is here