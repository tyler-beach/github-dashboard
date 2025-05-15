# GitHub Dashboard

## Overview

This application provides a comprehensive dashboard for monitoring and managing GitHub repositories. It uses the GitHub API to fetch data about repositories, teams, security findings, and compliance status. The application is designed to reduce the number of API calls to GitHub by caching data locally.

## Features

### Authentication

- Users authenticate by providing a GitHub personal access token
- The token is stored securely and not in the code
- Required scopes: `repo`, `read:org`, `read:user`, `security_events`

### Dashboard

- Displays key GitHub metrics such as number of repositories, teams, and commits
- Data is fetched upon login and stored locally
- Provides a button to re-fetch data if it has not been updated in 24 hours

### Repository Management

- Lists all repositories with filtering capabilities
- Filter repositories by GitHub Custom Property "Pod" value
- Additional filter based on the Custom Property "EnvironmentType"

### Security Findings

- Shows security findings by repository
- Includes findings from Code Scanning, Secrets Scanning, and Dependabot
- Displays the tool name that identified each finding
- Cross-checks against CODEOWNERS files to assign owners to findings
- Highlights findings without assigned owners

### Compliance Checks

Checks every repository with the Custom Property "EnvironmentType" set as Production for:

1. A valid CODEOWNERS file with no errors that covers every directory
2. HIGH or CRITICAL findings in code, secrets, or dependabot older than 30 days
3. Whether the repository only has teams assigned or if there are individuals with direct access
4. Whether any individuals have administrator/owner access on the repository

## Technical Details

- Built with React and TypeScript
- Uses IndexedDB (via Dexie.js) for local data storage
- Communicates with GitHub API using Octokit
- Responsive design with Tailwind CSS
- Data visualization with Chart.js

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Navigate to the application in your browser
5. Log in with your GitHub personal access token

## Data Caching

The application stores fetched data locally to reduce the number of API calls to GitHub. Data is considered stale after 24 hours, at which point a "Refresh Data" button will be highlighted to indicate that data should be updated.

## Security Considerations

- GitHub tokens are stored in the browser's localStorage and not in the code
- No sensitive data is transmitted to any third-party services
- The application runs entirely in the browser with no server-side components
