import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { initializeGitHub } from "../services/github";
import { FaGithub } from "react-icons/fa";

const Auth: React.FC = () => {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!token.trim()) {
        throw new Error("GitHub token is required");
      }

      // Initialize GitHub with the token
      initializeGitHub(token);

      // Test the token by making a simple API call
      const octokit = await import("@octokit/rest").then((module) => {
        return new module.Octokit({ auth: token });
      });

      await octokit.users.getAuthenticated();

      // If successful, navigate to dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error("Authentication error:", err);
      setError("Invalid GitHub token. Please check and try again.");
      localStorage.removeItem("github_token");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <FaGithub className="mx-auto text-6xl text-gray-800" />
          <h1 className="mt-4 text-2xl font-bold text-gray-800">
            GitHub Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Sign in with your GitHub Personal Access Token
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="token"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              GitHub Personal Access Token
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="input"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              Your token needs permissions for repos, teams, and security
              events.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`btn-primary w-full ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {isLoading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-600">
          <p>
            Don't have a token?{" "}
            <a
              href="https://github.com/settings/tokens/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Create one here
            </a>
          </p>
          <p className="mt-2">
            Required scopes: <code>repo</code>, <code>read:org</code>,{" "}
            <code>read:user</code>, <code>security_events</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
