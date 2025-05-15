import { Octokit } from "@octokit/rest";
import {
  db,
  Repository,
  Team,
  SecurityFinding,
  CodeOwner,
  ComplianceCheck,
  MetricsSummary,
} from "../db";

let octokit: Octokit | null = null;

export const initializeGitHub = (token: string): void => {
  octokit = new Octokit({ auth: token });
  localStorage.setItem("github_token", token);
};

export const isAuthenticated = (): boolean => {
  return localStorage.getItem("github_token") !== null;
};

export const getOctokit = (): Octokit => {
  if (!octokit) {
    const token = localStorage.getItem("github_token");
    if (!token) {
      throw new Error("GitHub token not found. Please authenticate first.");
    }
    octokit = new Octokit({ auth: token });
  }
  return octokit;
};

export const fetchRepositories = async (): Promise<Repository[]> => {
  try {
    const octokit = getOctokit();
    const response = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
    });

    const repositories: Repository[] = [];

    for (const repo of response.data) {
      // Fetch custom properties for each repository
      let customProperties = {};
      try {
        const propertiesResponse = await octokit.repos.getAllCustomProperties({
          owner: repo.owner.login,
          repo: repo.name,
        });
        customProperties = propertiesResponse.data;
      } catch (error) {
        console.error(
          `Failed to fetch custom properties for ${repo.full_name}:`,
          error,
        );
      }

      const repository: Repository = {
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        custom_properties: {
          pod: (customProperties as any).pod || undefined,
          environmentType:
            (customProperties as any).environmentType || undefined,
        },
        last_fetched: new Date(),
      };

      repositories.push(repository);

      // Store in database
      await db.repositories.put(repository);
    }

    return repositories;
  } catch (error) {
    console.error("Error fetching repositories:", error);
    throw error;
  }
};

export const fetchTeams = async (): Promise<Team[]> => {
  try {
    const octokit = getOctokit();
    const response = await octokit.teams.list({ per_page: 100 });

    const teams: Team[] = response.data.map((team) => ({
      id: team.id,
      name: team.name,
      slug: team.slug,
      description: team.description,
      html_url: team.html_url,
      last_fetched: new Date(),
    }));

    // Store in database
    await db.teams.bulkPut(teams);

    return teams;
  } catch (error) {
    console.error("Error fetching teams:", error);
    throw error;
  }
};

export const fetchSecurityFindings = async (): Promise<SecurityFinding[]> => {
  try {
    const octokit = getOctokit();
    const repositories = await db.repositories.toArray();
    const findings: SecurityFinding[] = [];

    for (const repo of repositories) {
      const [owner, repoName] = repo.full_name.split("/");

      // Fetch code scanning alerts
      try {
        const codeScanningResponse =
          await octokit.codeScanning.listAlertsForRepo({
            owner,
            repo: repoName,
            per_page: 100,
          });

        for (const alert of codeScanningResponse.data) {
          const finding: SecurityFinding = {
            id: `code_${repo.id}_${alert.number}`,
            repository_id: repo.id,
            repository_name: repo.full_name,
            tool: "code_scanning",
            severity: alert.rule.severity || "unknown",
            title: alert.rule.description,
            description: alert.most_recent_instance?.message?.text || "",
            html_url: alert.html_url,
            created_at: new Date(alert.created_at),
            directory_path: alert.most_recent_instance?.location?.path || "",
            owner: null, // Will be populated later by cross-checking with CODEOWNERS
            last_fetched: new Date(),
          };

          findings.push(finding);
        }
      } catch (error) {
        console.error(
          `Failed to fetch code scanning alerts for ${repo.full_name}:`,
          error,
        );
      }

      // Fetch secret scanning alerts
      try {
        const secretScanningResponse =
          await octokit.secretScanning.listAlertsForRepo({
            owner,
            repo: repoName,
            per_page: 100,
          });

        for (const alert of secretScanningResponse.data) {
          const finding: SecurityFinding = {
            id: `secret_${repo.id}_${alert.number}`,
            repository_id: repo.id,
            repository_name: repo.full_name,
            tool: "secret_scanning",
            severity: "critical", // Secret scanning alerts are always critical
            title: `Exposed ${alert.secret_type}`,
            description: `Secret detected in ${alert.secret_type}`,
            html_url: alert.html_url,
            created_at: new Date(alert.created_at),
            directory_path: alert.location || "",
            owner: null, // Will be populated later by cross-checking with CODEOWNERS
            last_fetched: new Date(),
          };

          findings.push(finding);
        }
      } catch (error) {
        console.error(
          `Failed to fetch secret scanning alerts for ${repo.full_name}:`,
          error,
        );
      }

      // Fetch Dependabot alerts
      try {
        const dependabotResponse = await octokit.dependabot.listAlertsForRepo({
          owner,
          repo: repoName,
          per_page: 100,
        });

        for (const alert of dependabotResponse.data) {
          const finding: SecurityFinding = {
            id: `dependabot_${repo.id}_${alert.number}`,
            repository_id: repo.id,
            repository_name: repo.full_name,
            tool: "dependabot",
            severity: alert.security_advisory.severity,
            title: alert.security_advisory.summary,
            description: alert.security_advisory.description,
            html_url: alert.html_url,
            created_at: new Date(alert.created_at),
            directory_path: alert.dependency.manifest_path || "",
            owner: null, // Will be populated later by cross-checking with CODEOWNERS
            last_fetched: new Date(),
          };

          findings.push(finding);
        }
      } catch (error) {
        console.error(
          `Failed to fetch Dependabot alerts for ${repo.full_name}:`,
          error,
        );
      }
    }

    // Store in database
    await db.securityFindings.bulkPut(findings);

    return findings;
  } catch (error) {
    console.error("Error fetching security findings:", error);
    throw error;
  }
};

export const fetchCodeOwners = async (): Promise<CodeOwner[]> => {
  try {
    const octokit = getOctokit();
    const repositories = await db.repositories.toArray();
    const codeOwners: CodeOwner[] = [];

    for (const repo of repositories) {
      const [owner, repoName] = repo.full_name.split("/");

      try {
        // Try to fetch CODEOWNERS file from different locations
        const paths = ["CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"];
        let codeOwnersContent = null;
        let foundPath = null;

        for (const path of paths) {
          try {
            const response = await octokit.repos.getContent({
              owner,
              repo: repoName,
              path,
            });

            if (response.data && "content" in response.data) {
              codeOwnersContent = Buffer.from(
                response.data.content,
                "base64",
              ).toString();
              foundPath = path;
              break;
            }
          } catch (e) {
            // File not found at this path, try next one
          }
        }

        if (codeOwnersContent) {
          // Parse CODEOWNERS file
          const lines = codeOwnersContent
            .split("\n")
            .filter(
              (line) => line.trim() !== "" && !line.trim().startsWith("#"),
            );

          for (const line of lines) {
            const [directoryPath, ...owners] = line.trim().split(/\s+/);

            if (directoryPath && owners.length > 0) {
              const codeOwner: CodeOwner = {
                repository_id: repo.id,
                repository_name: repo.full_name,
                directory_path: directoryPath,
                owner: owners.join(" "),
                last_fetched: new Date(),
              };

              codeOwners.push(codeOwner);
            }
          }
        }
      } catch (error) {
        console.error(
          `Failed to fetch CODEOWNERS for ${repo.full_name}:`,
          error,
        );
      }
    }

    // Store in database
    await db.codeOwners.bulkPut(codeOwners);

    return codeOwners;
  } catch (error) {
    console.error("Error fetching code owners:", error);
    throw error;
  }
};

export const assignOwnersToFindings = async (): Promise<void> => {
  try {
    const findings = await db.securityFindings.toArray();
    const codeOwners = await db.codeOwners.toArray();

    for (const finding of findings) {
      // Find the most specific code owner for this file path
      const repoCodeOwners = codeOwners.filter(
        (owner) => owner.repository_id === finding.repository_id,
      );

      let bestMatch: CodeOwner | null = null;
      let bestMatchLength = 0;

      for (const codeOwner of repoCodeOwners) {
        const pattern = codeOwner.directory_path;

        // Handle glob patterns and exact matches
        if (
          pattern === "*" ||
          finding.directory_path === pattern ||
          (pattern.endsWith("/*") &&
            finding.directory_path.startsWith(pattern.slice(0, -1))) ||
          (pattern.endsWith("/**") &&
            finding.directory_path.startsWith(pattern.slice(0, -2)))
        ) {
          // Choose the most specific match (longest path)
          if (pattern.length > bestMatchLength) {
            bestMatch = codeOwner;
            bestMatchLength = pattern.length;
          }
        }
      }

      if (bestMatch) {
        finding.owner = bestMatch.owner;
        await db.securityFindings.put(finding);
      }
    }
  } catch (error) {
    console.error("Error assigning owners to findings:", error);
    throw error;
  }
};

export const performComplianceChecks = async (): Promise<ComplianceCheck[]> => {
  try {
    const octokit = getOctokit();
    const repositories = await db.repositories
      .filter((repo) => repo.custom_properties.environmentType === "Production")
      .toArray();

    const complianceChecks: ComplianceCheck[] = [];

    for (const repo of repositories) {
      const [owner, repoName] = repo.full_name.split("/");

      // Check 1: Valid CODEOWNERS file
      let validCodeowners = false;
      try {
        // Check if CODEOWNERS file exists
        const paths = ["CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"];
        let codeOwnersContent = null;

        for (const path of paths) {
          try {
            const response = await octokit.repos.getContent({
              owner,
              repo: repoName,
              path,
            });

            if (response.data && "content" in response.data) {
              codeOwnersContent = Buffer.from(
                response.data.content,
                "base64",
              ).toString();
              break;
            }
          } catch (e) {
            // File not found at this path, try next one
          }
        }

        // Check if CODEOWNERS file covers all directories
        if (codeOwnersContent) {
          // Simple check: ensure there's at least one wildcard entry
          validCodeowners = codeOwnersContent.includes("*");
        }
      } catch (error) {
        console.error(
          `Failed to check CODEOWNERS for ${repo.full_name}:`,
          error,
        );
      }

      // Check 2: HIGH or CRITICAL findings older than 30 days
      let oldHighCriticalFindings = false;
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const oldFindings = await db.securityFindings
          .where({
            repository_id: repo.id,
          })
          .filter(
            (finding) =>
              (finding.severity === "high" ||
                finding.severity === "critical" ||
                finding.severity === "HIGH" ||
                finding.severity === "CRITICAL") &&
              finding.created_at < thirtyDaysAgo,
          )
          .count();

        oldHighCriticalFindings = oldFindings > 0;
      } catch (error) {
        console.error(
          `Failed to check old findings for ${repo.full_name}:`,
          error,
        );
      }

      // Check 3: Direct user access and admin/owner access
      let directUserAccess = false;
      let adminOwnerAccess = false;
      try {
        const collaboratorsResponse = await octokit.repos.listCollaborators({
          owner,
          repo: repoName,
          per_page: 100,
        });

        directUserAccess = collaboratorsResponse.data.length > 0;
        adminOwnerAccess = collaboratorsResponse.data.some(
          (collaborator) =>
            collaborator.permissions?.admin ||
            collaborator.permissions?.maintain,
        );
      } catch (error) {
        console.error(
          `Failed to check collaborators for ${repo.full_name}:`,
          error,
        );
      }

      const complianceCheck: ComplianceCheck = {
        repository_id: repo.id,
        repository_name: repo.full_name,
        valid_codeowners: validCodeowners,
        old_high_critical_findings: oldHighCriticalFindings,
        direct_user_access: directUserAccess,
        admin_owner_access: adminOwnerAccess,
        last_checked: new Date(),
      };

      complianceChecks.push(complianceCheck);

      // Store in database
      await db.complianceChecks.put(complianceCheck);
    }

    return complianceChecks;
  } catch (error) {
    console.error("Error performing compliance checks:", error);
    throw error;
  }
};

export const fetchMetricsSummary = async (): Promise<MetricsSummary> => {
  try {
    const octokit = getOctokit();

    // Count repositories
    const repositoryCount = await db.repositories.count();

    // Count teams
    const teamCount = await db.teams.count();

    // Count commits (last 30 days across all repos)
    let commitCount = 0;
    const repositories = await db.repositories.toArray();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const repo of repositories.slice(0, 5)) {
      // Limit to first 5 repos to avoid rate limiting
      const [owner, repoName] = repo.full_name.split("/");

      try {
        const commitsResponse = await octokit.repos.listCommits({
          owner,
          repo: repoName,
          since: thirtyDaysAgo.toISOString(),
          per_page: 100,
        });

        commitCount += commitsResponse.data.length;
      } catch (error) {
        console.error(`Failed to fetch commits for ${repo.full_name}:`, error);
      }
    }

    const metricsSummary: MetricsSummary = {
      id: 1,
      repository_count: repositoryCount,
      team_count: teamCount,
      commit_count: commitCount,
      last_fetched: new Date(),
    };

    // Store in database
    await db.metricsSummary.put(metricsSummary);

    return metricsSummary;
  } catch (error) {
    console.error("Error fetching metrics summary:", error);
    throw error;
  }
};

export const fetchAllData = async (): Promise<void> => {
  try {
    await fetchRepositories();
    await fetchTeams();
    await fetchSecurityFindings();
    await fetchCodeOwners();
    await assignOwnersToFindings();
    await performComplianceChecks();
    await fetchMetricsSummary();
  } catch (error) {
    console.error("Error fetching all data:", error);
    throw error;
  }
};
