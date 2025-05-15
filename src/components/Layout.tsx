import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  FaGithub,
  FaTachometerAlt,
  FaCodeBranch,
  FaShieldAlt,
  FaClipboardCheck,
  FaSignOutAlt,
  FaChartBar,
} from "react-icons/fa";

const Layout: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("github_token");
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 flex items-center">
          <FaGithub className="text-2xl mr-2" />
          <h1 className="text-xl font-bold">GitHub Dashboard</h1>
        </div>

        <nav className="flex-1 mt-6">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center py-3 px-4 ${isActive ? "bg-gray-700" : "hover:bg-gray-700"}`
            }
          >
            <FaTachometerAlt className="mr-3" />
            Dashboard
          </NavLink>

          <NavLink
            to="/repositories"
            className={({ isActive }) =>
              `flex items-center py-3 px-4 ${isActive ? "bg-gray-700" : "hover:bg-gray-700"}`
            }
          >
            <FaCodeBranch className="mr-3" />
            Repositories
          </NavLink>

          <NavLink
            to="/security"
            className={({ isActive }) =>
              `flex items-center py-3 px-4 ${isActive ? "bg-gray-700" : "hover:bg-gray-700"}`
            }
          >
            <FaShieldAlt className="mr-3" />
            Security Findings
          </NavLink>

          <NavLink
            to="/compliance"
            className={({ isActive }) =>
              `flex items-center py-3 px-4 ${isActive ? "bg-gray-700" : "hover:bg-gray-700"}`
            }
          >
            <FaClipboardCheck className="mr-3" />
            Compliance
          </NavLink>

          <NavLink
            to="/api-usage"
            className={({ isActive }) =>
              `flex items-center py-3 px-4 ${isActive ? "bg-gray-700" : "hover:bg-gray-700"}`
            }
          >
            <FaChartBar className="mr-3" />
            API Usage
          </NavLink>
        </nav>

        <div className="p-4">
          <button
            onClick={handleLogout}
            className="flex items-center text-gray-400 hover:text-white w-full"
          >
            <FaSignOutAlt className="mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
