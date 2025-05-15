import React, { useEffect, useState } from 'react';
import { Octokit } from '@octokit/rest';
import { useAuth } from '../services/auth';

interface RateLimitData {
  core: {
    limit: number;
    used: number;
    remaining: number;
    reset: number;
  };
  search: {
    limit: number;
    used: number;
    remaining: number;
    reset: number;
  };
  graphql: {
    limit: number;
    used: number;
    remaining: number;
    reset: number;
  };
}

export const ApiUsage: React.FC = () => {
  const { token } = useAuth();
  const [rateLimits, setRateLimits] = useState<RateLimitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRateLimits = async () => {
      if (!token) {
        setError('Authentication token not found');
        setLoading(false);
        return;
      }

      try {
        const octokit = new Octokit({ auth: token });
        const response = await octokit.rateLimit.get();
        setRateLimits(response.data.resources);
        setError(null);
      } catch (err) {
        setError('Failed to fetch rate limits');
        console.error('Error fetching rate limits:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRateLimits();
    const interval = setInterval(fetchRateLimits, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [token]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString();
  };

  const calculatePercentage = (used: number, limit: number) => {
    return Math.round((used / limit) * 100);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">GitHub API Usage</h2>
      
      {rateLimits && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Core Rate Limits */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">REST API (Core)</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Usage</span>
                  <span>{rateLimits.core.used} / {rateLimits.core.limit}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${calculatePercentage(rateLimits.core.used, rateLimits.core.limit)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Resets at {formatTime(rateLimits.core.reset)}
                </div>
              </div>
            </div>
          </div>

          {/* Search Rate Limits */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Search API</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Usage</span>
                  <span>{rateLimits.search.used} / {rateLimits.search.limit}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${calculatePercentage(rateLimits.search.used, rateLimits.search.limit)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Resets at {formatTime(rateLimits.search.reset)}
                </div>
              </div>
            </div>
          </div>

          {/* GraphQL Rate Limits */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">GraphQL API</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Usage</span>
                  <span>{rateLimits.graphql.used} / {rateLimits.graphql.limit}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${calculatePercentage(rateLimits.graphql.used, rateLimits.graphql.limit)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Resets at {formatTime(rateLimits.graphql.reset)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 