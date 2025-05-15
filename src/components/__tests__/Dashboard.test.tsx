import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { isAuthenticated } from '../../services/github';
import { db } from '../../db';

// Mock the dependencies
jest.mock('../../services/github');
jest.mock('../../db');
jest.mock('react-chartjs-2', () => ({
  Doughnut: () => null,
  Bar: () => null,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock default authenticated state
    (isAuthenticated as jest.Mock).mockReturnValue(true);
    // Mock database calls
    (db.isDataStale as jest.Mock).mockResolvedValue(false);
    (db.metricsSummary.get as jest.Mock).mockResolvedValue({
      repository_count: 10,
      team_count: 5,
      commit_count: 100,
      last_fetched: new Date(),
    });
    (db.securityFindings.toArray as jest.Mock).mockResolvedValue([
      { severity: 'HIGH' },
      { severity: 'medium' },
      { severity: 'low' },
    ]);
    (db.complianceChecks.toArray as jest.Mock).mockResolvedValue([
      { valid_codeowners: true, old_high_critical_findings: false },
      { valid_codeowners: false, old_high_critical_findings: true },
    ]);
  });

  it('redirects to home when not authenticated', () => {
    (isAuthenticated as jest.Mock).mockReturnValue(false);
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('displays loading state initially', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
    expect(screen.getByText('GitHub Dashboard')).toBeInTheDocument();
  });

  it('displays metrics when data is loaded', async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // repository count
      expect(screen.getByText('5')).toBeInTheDocument(); // team count
      expect(screen.getByText('100')).toBeInTheDocument(); // commit count
    });
  });

  it('handles refresh button click', async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    const refreshButton = screen.getByText(/Refresh/i);
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(refreshButton).toBeDisabled();
    });
  });

  it('handles shutdown button click with confirmation', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });
    global.fetch = mockFetch;
    global.confirm = jest.fn(() => true);

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    const shutdownButton = screen.getByText('Shutdown');
    fireEvent.click(shutdownButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/shutdown', {
        method: 'POST',
      });
    });
  });

  it('shows error state when shutdown fails', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('Shutdown failed'));
    global.fetch = mockFetch;
    global.confirm = jest.fn(() => true);
    global.console.error = jest.fn();

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    const shutdownButton = screen.getByText('Shutdown');
    fireEvent.click(shutdownButton);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
    });
  });
}); 