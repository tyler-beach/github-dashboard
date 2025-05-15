import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAllData, isAuthenticated } from "../services/github";
import { db, MetricsSummary } from "../db";
import { format } from "date-fns";
import {
  FaSync,
  FaGithub,
  FaCodeBranch,
  FaUsers,
  FaCode,
  FaPowerOff,
} from "react-icons/fa";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [isDataStale, setIsDataStale] = useState(false);
  const [securityStats, setSecurityStats] = useState<{
    high: number;
    medium: number;
    low: number;
  }>({ high: 0, medium: 0, low: 0 });
  const [complianceStats, setComplianceStats] = useState<{
    compliant: number;
    nonCompliant: number;
  }>({ compliant: 0, nonCompliant: 0 });
  const [isShuttingDown, setIsShuttingDown] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/");
      return;
    }

    const loadData = async () => {
      try {
        // Check if data is stale (older than 24 hours)
        const isStale = await db.isDataStale();
        setIsDataStale(isStale);

        // Load metrics from database
        const metricsSummary = await db.metricsSummary.get(1);
        if (metricsSummary) {
          setMetrics(metricsSummary);
          setLastFetched(metricsSummary.last_fetched);
        }

        // Load security findings stats
        const findings = await db.securityFindings.toArray();
        const highCount = findings.filter(
          (f) =>
            f.severity === "high" ||
            f.severity === "critical" ||
            f.severity === "HIGH" ||
            f.severity === "CRITICAL",
        ).length;
        const mediumCount = findings.filter(
          (f) => f.severity === "medium" || f.severity === "MEDIUM",
        ).length;
        const lowCount = findings.filter(
          (f) =>
            f.severity === "low" ||
            f.severity === "LOW" ||
            f.severity === "note" ||
            f.severity === "NOTE",
        ).length;

        setSecurityStats({
          high: highCount,
          medium: mediumCount,
          low: lowCount,
        });

        // Load compliance stats
        const complianceChecks = await db.complianceChecks.toArray();
        const compliantCount = complianceChecks.filter(
          (c) =>
            c.valid_codeowners &&
            !c.old_high_critical_findings &&
            !c.direct_user_access &&
            !c.admin_owner_access,
        ).length;

        setComplianceStats({
          compliant: compliantCount,
          nonCompliant: complianceChecks.length - compliantCount,
        });

        // If no data or data is stale, fetch it automatically
        if (!metricsSummary || isStale) {
          await handleRefresh();
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };

    loadData();
  }, [navigate]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await fetchAllData();

      // Update UI with new data
      const metricsSummary = await db.metricsSummary.get(1);
      if (metricsSummary) {
        setMetrics(metricsSummary);
        setLastFetched(metricsSummary.last_fetched);
      }

      setIsDataStale(false);

      // Refresh security stats
      const findings = await db.securityFindings.toArray();
      const highCount = findings.filter(
        (f) =>
          f.severity === "high" ||
          f.severity === "critical" ||
          f.severity === "HIGH" ||
          f.severity === "CRITICAL",
      ).length;
      const mediumCount = findings.filter(
        (f) => f.severity === "medium" || f.severity === "MEDIUM",
      ).length;
      const lowCount = findings.filter(
        (f) =>
          f.severity === "low" ||
          f.severity === "LOW" ||
          f.severity === "note" ||
          f.severity === "NOTE",
      ).length;

      setSecurityStats({ high: highCount, medium: mediumCount, low: lowCount });

      // Refresh compliance stats
      const complianceChecks = await db.complianceChecks.toArray();
      const compliantCount = complianceChecks.filter(
        (c) =>
          c.valid_codeowners &&
          !c.old_high_critical_findings &&
          !c.direct_user_access &&
          !c.admin_owner_access,
      ).length;

      setComplianceStats({
        compliant: compliantCount,
        nonCompliant: complianceChecks.length - compliantCount,
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShutdown = async () => {
    if (window.confirm('Are you sure you want to shut down the environment? This will stop all containers and clean up resources.')) {
      setIsShuttingDown(true);
      try {
        const response = await fetch('/api/shutdown', {
          method: 'POST',
        });
        const data = await response.json();
        
        if (data.success) {
          alert('Environment is shutting down. You can close this window.');
        } else {
          alert('Failed to shut down the environment: ' + data.message);
        }
      } catch (error) {
        console.error('Error shutting down:', error);
        alert('Failed to shut down the environment. Please check the console for details.');
      } finally {
        setIsShuttingDown(false);
      }
    }
  };

  const securityChartData = {
    labels: ["High/Critical", "Medium", "Low/Note"],
    datasets: [
      {
        data: [securityStats.high, securityStats.medium, securityStats.low],
        backgroundColor: ["#ef4444", "#f59e0b", "#3b82f6"],
        borderWidth: 0,
      },
    ],
  };

  const complianceChartData = {
    labels: ["Compliant", "Non-Compliant"],
    datasets: [
      {
        data: [complianceStats.compliant, complianceStats.nonCompliant],
        backgroundColor: ["#10b981", "#ef4444"],
        borderWidth: 0,
      },
    ],
  };

  const repoBarData = {
    labels: ["Repositories", "Teams", "Commits (30 days)"],
    datasets: [
      {
        label: "Count",
        data: metrics
          ? [metrics.repository_count, metrics.team_count, metrics.commit_count]
          : [0, 0, 0],
        backgroundColor: ["#3b82f6", "#8b5cf6", "#10b981"],
      },
    ],
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">GitHub Dashboard</h1>
        <div className="flex items-center space-x-4">
          {lastFetched && (
            <span className="text-sm text-gray-500 mr-4">
              Last updated: {format(lastFetched, "MMM d, yyyy h:mm a")}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={`btn-primary flex items-center ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            <FaSync className={`mr-2 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading
              ? "Refreshing..."
              : isDataStale
                ? "Refresh Data (Stale)"
                : "Refresh Data"}
          </button>
          
          <button
            onClick={handleShutdown}
            disabled={isShuttingDown}
            className={`btn-primary flex items-center ${isShuttingDown ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            <FaPowerOff className={`mr-2 ${isShuttingDown ? "animate-pulse" : ""}`} />
            Shutdown
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card flex items-center">
          <div className="p-3 rounded-full bg-blue-100 mr-4">
            <FaCodeBranch className="text-blue-600 text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Repositories</h3>
            <p className="text-2xl font-bold">
              {metrics?.repository_count || 0}
            </p>
          </div>
        </div>

        <div className="card flex items-center">
          <div className="p-3 rounded-full bg-purple-100 mr-4">
            <FaUsers className="text-purple-600 text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Teams</h3>
            <p className="text-2xl font-bold">{metrics?.team_count || 0}</p>
          </div>
        </div>

        <div className="card flex items-center">
          <div className="p-3 rounded-full bg-green-100 mr-4">
            <FaCode className="text-green-600 text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Commits (30 days)</h3>
            <p className="text-2xl font-bold">{metrics?.commit_count || 0}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Security Findings</h2>
          <div className="h-64 flex justify-center">
            <Doughnut
              data={securityChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom",
                  },
                },
              }}
            />
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Total Findings:{" "}
              {securityStats.high + securityStats.medium + securityStats.low}
            </p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Compliance Status</h2>
          <div className="h-64 flex justify-center">
            <Doughnut
              data={complianceChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom",
                  },
                },
              }}
            />
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Total Repositories Checked:{" "}
              {complianceStats.compliant + complianceStats.nonCompliant}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">GitHub Metrics</h2>
        <div className="h-64">
          <Bar
            data={repoBarData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false,
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
