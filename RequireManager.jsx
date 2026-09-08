import React from "react";
import { Navigate } from "react-router-dom";
import { useManagerAuth } from "../../context/ManagerAuthContext.jsx";

export default function RequireManager({ children }) {
  const { manager, loading } = useManagerAuth();
  if (loading) return null;
  if (!manager) return <Navigate to="/manager/login" replace />;
  return children;
}
