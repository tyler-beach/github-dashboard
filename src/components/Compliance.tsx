import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated } from "../services/github";
import { db, ComplianceCheck } from "../db";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaExternalLinkAlt,
} from "react-icons/fa";

const Compliance: React.FC = () => {
  const navigate = useNavigate();
  const [complianceChecks, setComplianceChecks] = useState<ComplianceCheck[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/");
      return;
    }

    const loadComplianceData = async () => {
      setIsLoading(true);
      try {
        // Get all compliance checks for production repositories
        const checks = await db.complianceChecks.toArray();

        // Sort by compliance status (non-compliant first)
        checks.sort((a, b) => {
          const aCompliant = isCompliant(a);
          const bCompliant = isCompliant(b);
          if (aCompliant === bCompliant)
            return a.repository_name.localeCompare(b.repository_name);
          return aCompliant ? 1 : -1;
        });

        setComplianceChecks(checks);
      } catch (error) {
        console.error("Error loading compliance data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadComplianceData();
  }, [navigate]);

  const isCompliant = (check: ComplianceCheck): boolean => {
    return (
      check.valid_codeowners &&
      !check.old_high_critical_findings &&
      !check.direct_user_access &&
      !check.admin_owner_access
    );
  };

  const getComplianceStatus = (check: ComplianceCheck) => {
    if (isCompliant(check)) {
      return (
        <div className="flex items-center text-green-600">
          <FaCheckCircle className="mr-2" />
          <span>Compliant</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-red-600">
          <FaTimesCircle className="mr-2" />
          <span>Non-Compliant</span>
        </div>
      );
    }
  };

  const getStatusIcon = (status: boolean, positive: boolean = true) => {
    if (positive ? status : !status) {
      return <FaCheckCircle className="text-green-500" />;
    } else {
      return <FaTimesCircle className="text-red-500" />;
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Compliance Checks</h1>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Compliance Summary</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-gray-500">
              Total Repositories
            </h3>
            <p className="mt-1 text-2xl font-semibold">
              {complianceChecks.length}
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-green-700">Compliant</h3>
            <p className="mt-1 text-2xl font-semibold text-green-700">
              {complianceChecks.filter((check) => isCompliant(check)).length}
            </p>
          </div>

          <div className="bg-red-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-red-700">Non-Compliant</h3>
            <p className="mt-1 text-2xl font-semibold text-red-700">
              {complianceChecks.filter((check) => !isCompliant(check)).length}
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-blue-700">
              Compliance Rate
            </h3>
            <p className="mt-1 text-2xl font-semibold text-blue-700">
              {complianceChecks.length > 0
                ? Math.round(
                    (complianceChecks.filter((check) => isCompliant(check))
                      .length /
                      complianceChecks.length) *
                      100,
                  )
                : 0}
              %
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">
          Production Repositories Compliance
        </h2>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading compliance data...</p>
          </div>
        ) : complianceChecks.length === 0 ? (
          <div className="text-center py-8">
            <FaExclamationTriangle className="mx-auto text-yellow-500 text-2xl" />
            <p className="mt-2 text-gray-600">
              No production repositories found to check for compliance.
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
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Valid CODEOWNERS
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    No Old Critical Findings
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Team Access Only
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    No Admin/Owner Users
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {complianceChecks.map((check) => (
                  <tr
                    key={check.repository_id}
                    className={`hover:bg-gray-50 ${!isCompliant(check) ? "bg-red-50" : ""}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {check.repository_name}
                        </div>
                        <a
                          href={`https://github.com/${check.repository_name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:text-blue-900"
                        >
                          <FaExternalLinkAlt className="text-xs" />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getComplianceStatus(check)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusIcon(check.valid_codeowners)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusIcon(!check.old_high_critical_findings)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusIcon(!check.direct_user_access)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusIcon(!check.admin_owner_access)}
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

export default Compliance;
