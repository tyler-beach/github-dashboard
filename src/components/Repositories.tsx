import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated } from "../services/github";
import { db, Repository } from "../db";
import { FaFilter, FaExternalLinkAlt } from "react-icons/fa";

const Repositories: React.FC = () => {
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [filteredRepositories, setFilteredRepositories] = useState<
    Repository[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [podOptions, setPodOptions] = useState<string[]>([]);
  const [envOptions, setEnvOptions] = useState<string[]>([]);
  const [selectedPod, setSelectedPod] = useState<string>("");
  const [selectedEnv, setSelectedEnv] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/");
      return;
    }

    const loadRepositories = async () => {
      setIsLoading(true);
      try {
        const repos = await db.repositories.toArray();
        setRepositories(repos);
        setFilteredRepositories(repos);

        // Extract unique pod values
        const pods = new Set<string>();
        repos.forEach((repo) => {
          if (repo.custom_properties.pod) {
            pods.add(repo.custom_properties.pod);
          }
        });
        setPodOptions(Array.from(pods));

        // Extract unique environment type values
        const envs = new Set<string>();
        repos.forEach((repo) => {
          if (repo.custom_properties.environmentType) {
            envs.add(repo.custom_properties.environmentType);
          }
        });
        setEnvOptions(Array.from(envs));
      } catch (error) {
        console.error("Error loading repositories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRepositories();
  }, [navigate]);

  useEffect(() => {
    // Apply filters whenever filter criteria change
    let filtered = repositories;

    if (selectedPod) {
      filtered = filtered.filter(
        (repo) => repo.custom_properties.pod === selectedPod,
      );
    }

    if (selectedEnv) {
      filtered = filtered.filter(
        (repo) => repo.custom_properties.environmentType === selectedEnv,
      );
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (repo) =>
          repo.name.toLowerCase().includes(term) ||
          repo.full_name.toLowerCase().includes(term) ||
          (repo.description && repo.description.toLowerCase().includes(term)),
      );
    }

    setFilteredRepositories(filtered);
  }, [repositories, selectedPod, selectedEnv, searchTerm]);

  const clearFilters = () => {
    setSelectedPod("");
    setSelectedEnv("");
    setSearchTerm("");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">GitHub Repositories</h1>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex items-center mb-4">
          <FaFilter className="text-gray-500 mr-2" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Search
            </label>
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              placeholder="Search repositories..."
            />
          </div>

          <div>
            <label
              htmlFor="pod"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Pod
            </label>
            <select
              id="pod"
              value={selectedPod}
              onChange={(e) => setSelectedPod(e.target.value)}
              className="select"
            >
              <option value="">All Pods</option>
              {podOptions.map((pod) => (
                <option key={pod} value={pod}>
                  {pod}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="env"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Environment Type
            </label>
            <select
              id="env"
              value={selectedEnv}
              onChange={(e) => setSelectedEnv(e.target.value)}
              className="select"
            >
              <option value="">All Environments</option>
              {envOptions.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={clearFilters} className="btn-secondary">
            Clear Filters
          </button>
        </div>
      </div>

      {/* Repository List */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading repositories...</p>
          </div>
        ) : filteredRepositories.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">
              No repositories found matching the current filters.
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
                    Repository
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Pod
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Environment
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
                {filteredRepositories.map((repo) => (
                  <tr key={repo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {repo.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {repo.full_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-md truncate">
                        {repo.description || "No description"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {repo.custom_properties.pod ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {repo.custom_properties.pod}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {repo.custom_properties.environmentType ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {repo.custom_properties.environmentType}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a
                        href={repo.html_url}
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

export default Repositories;
