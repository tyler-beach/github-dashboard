import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useRoutes } from "react-router-dom";
import routes from "tempo-routes";
import Auth from "./components/Auth";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import Repositories from "./components/Repositories";
import SecurityFindings from "./components/SecurityFindings";
import Compliance from "./components/Compliance";
import { ApiUsage } from "./components/ApiUsage";
import { isAuthenticated } from "./services/github";
import { TempoDevtools } from "tempo-devtools";

// Initialize Tempo Devtools
TempoDevtools.init();

function App() {
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Check authentication status
    setAuthChecked(true);
  }, []);

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* Tempo routes */}
      {import.meta.env.VITE_TEMPO && useRoutes(routes)}

      <Routes>
        <Route
          path="/"
          element={isAuthenticated() ? <Navigate to="/dashboard" /> : <Auth />}
        />
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="repositories" element={<Repositories />} />
          <Route path="security" element={<SecurityFindings />} />
          <Route path="compliance" element={<Compliance />} />
          <Route path="api-usage" element={<ApiUsage />} />
        </Route>

        {/* Add this before the catchall route */}
        {import.meta.env.VITE_TEMPO && <Route path="/tempobook/*" />}

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
