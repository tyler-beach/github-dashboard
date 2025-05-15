import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated } from "../services/github";
import { db, SecurityFinding } from "../db";
import {
  FaExclamationTriangle,
  FaShieldAlt,
  FaLock,
  FaBox,
  FaExternalLinkAlt,
  FaFilter,
} from "react-icons/fa";

const SecurityFindings: React.FC = () => {
  const navigate = useNavigate();
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [filteredFindings, setFilteredFindings] = useState<SecurityFinding[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [repositories, setRepositories] = useState<string[]>([]);
  const [selectedRepository, setSelectedRepository] = useState<string>("");
  const [selectedTool, setSelectedTool] = useState<string>("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("");
  const [selectedOwnerStatus, setSelectedOwnerStatus] = useState<string>("");

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/");
      return;
    }

    const loadFindings = async () => {
      setIsLoading(true);
      try {
        const securityFindings = await db.securityFindings.toArray();
        setFindings(securityFindings);
        setFilteredFindings(securityFindings);

        // Extract unique repository names
        const repoNames = new Set<string>();
        securityFindings.forEach((finding) => {
          repoNames.add(finding.repository_name);
        });
        setRepositories(Array.from(repoNames));
      } catch (error) {
        console.error("Error loading security findings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFindings();
  }, [navigate]);

  useEffect(() => {
    // Apply filters whenever filter criteria change
    let filtered = findings;

    if (selectedRepository) {
      filtered = filtered.filter(
        (finding) => finding.repository_name === selectedRepository,
      );
    }

    if (selectedTool) {
      filtered = filtered.filter((finding) => finding.tool === selectedTool);
    }

    if (selectedSeverity) {
      filtered = filtered.filter((finding) => {
        const severity = finding.severity.toLowerCase();
        return severity === selectedSeverity.toLowerCase();
      });
    }

    if (selectedOwnerStatus === "with-owner") {
      filtered = filtered.filter((finding) => finding.owner !== null);
    } else if (selectedOwnerStatus === "without-owner") {
      filtered = filtered.filter((finding) => finding.owner === null);
    }

    setFilteredFindings(filtered);
  }, [
    findings,
    selectedRepository,
    selectedTool,
    selectedSeverity,
    selectedOwnerStatus,
  ]);

  const clearFilters = () => {
    setSelectedRepository("");
    setSelectedTool("");
    setSelectedSeverity("");
    setSelectedOwnerStatus("");
  };

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case "code_scanning":
        return <FaShieldAlt className="text-blue-500" />;
      case "secret_scanning":
        return <FaLock className="text-purple-500" />;
      case "dependabot":
        return <FaBox className="text-green-500" />;
      default:
        return <FaExclamationTriangle className="text-yellow-500" />;
    }
  };

  const getToolName = (tool: string) => {
    switch (tool) {
      case "code_scanning":
        return "Code Scanning";
      case "secret_scanning":
        return "Secret Scanning";
      case "dependabot":
        return "Dependabot";
      default:
        return tool;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const severityLower = severity.toLowerCase();
    let bgColor = "bg-gray-100";
    let textColor = "text-gray-800";

    if (severityLower === "critical") {
      bgColor = "bg-red-100";
      textColor = "text-red-800";
    } else if (severityLower === "high") {
      bgColor = "bg-orange-100";
      textColor = "text-orange-800";
    } else if (severityLower === "medium") {
      bgColor = "bg-yellow-100";
      textColor = "text-yellow-800";
    } else if (severityLower === "low") {
      bgColor = "bg-blue-100";
      textColor = "text-blue-800";
    }

    return (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor} ${textColor}`}
      >
        {severity.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Security Findings</h1>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex items-center mb-4">
          <FaFilter className="text-gray-500 mr-2" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label
              htmlFor="repository"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Repository
            </label>
            <select
              id="repository"
              value={selectedRepository}
              onChange={(e) => setSelectedRepository(e.target.value)}
              className="select"
            >
              <option value="">All Repositories</option>
              {repositories.map((repo) => (
                <option key={repo} value={repo}>
                  {repo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="tool"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Tool
            </label>
            <select
              id="tool"
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
              className="select"
            >
              <option value="">All Tools</option>
              <option value="code_scanning">Code Scanning</option>
              <option value="secret_scanning">Secret Scanning</option>
              <option value="dependabot">Dependabot</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="severity"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Severity
            </label>
            <select
              id="severity"
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="select"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="owner"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Owner Status
            </label>
            <select
              id="owner"
              value={selectedOwnerStatus}
              onChange={(e) => setSelectedOwnerStatus(e.target.value)}
              className="select"
            >
              <option value="">All</option>
              <option value="with-owner">With Owner</option>
              <option value="without-owner">Without Owner</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={clearFilters} className="btn-secondary">
            Clear Filters
          </button>
        </div>
      </div>

      {/* Findings List */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading security findings...</p>
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">
              No security findings found matching the current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Finding
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Repository
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Tool
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Severity
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Owner
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFindings.map((finding) => (
                  <tr key={finding.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {finding.title}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {finding.description}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {finding.directory_path}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {finding.repository_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getToolIcon(finding.tool)}
                        <span className="ml-2 text-sm text-gray-900">
                          {getToolName(finding.tool)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSeverityBadge(finding.severity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {finding.owner ? (
                        <span className="text-sm text-gray-900">
                          {finding.owner}
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          No Owner
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a
                        href={finding.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                      >
                        View <FaExternalLinkAlt className="ml-1 text-xs" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityFindings;
