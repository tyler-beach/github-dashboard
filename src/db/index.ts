import Dexie, { Table } from "dexie";

// Define interfaces for our database tables
export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  custom_properties: {
    pod?: string;
    environmentType?: string;
  };
  last_fetched: Date;
}

export interface Team {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  html_url: string;
  last_fetched: Date;
}

export interface SecurityFinding {
  id: string;
  repository_id: number;
  repository_name: string;
  tool: string; // 'code_scanning' | 'secret_scanning' | 'dependabot'
  severity: string;
  title: string;
  description: string;
  html_url: string;
  created_at: Date;
  directory_path: string;
  owner: string | null;
  last_fetched: Date;
}

export interface CodeOwner {
  repository_id: number;
  repository_name: string;
  directory_path: string;
  owner: string;
  last_fetched: Date;
}

export interface ComplianceCheck {
  repository_id: number;
  repository_name: string;
  valid_codeowners: boolean;
  old_high_critical_findings: boolean;
  direct_user_access: boolean;
  admin_owner_access: boolean;
  last_checked: Date;
}

export interface MetricsSummary {
  id: 1; // Only one record
  repository_count: number;
  team_count: number;
  commit_count: number;
  last_fetched: Date;
}

class GitHubDatabase extends Dexie {
  repositories!: Table<Repository>;
  teams!: Table<Team>;
  securityFindings!: Table<SecurityFinding>;
  codeOwners!: Table<CodeOwner>;
  complianceChecks!: Table<ComplianceCheck>;
  metricsSummary!: Table<MetricsSummary>;

  constructor() {
    super("GitHubDatabase");
    this.version(1).stores({
      repositories:
        "++id, name, full_name, custom_properties.pod, custom_properties.environmentType, last_fetched",
      teams: "++id, name, slug, last_fetched",
      securityFindings:
        "id, repository_id, repository_name, tool, severity, created_at, directory_path, owner, last_fetched",
      codeOwners:
        "[repository_id+directory_path], repository_name, owner, last_fetched",
      complianceChecks: "repository_id, repository_name, last_checked",
      metricsSummary: "id, last_fetched",
    });
  }

  async isDataStale(): Promise<boolean> {
    const summary = await this.metricsSummary.get(1);
    if (!summary) return true;

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    return summary.last_fetched < oneDayAgo;
  }
}

export const db = new GitHubDatabase();
