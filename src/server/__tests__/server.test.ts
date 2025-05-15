import request from 'supertest';
import express from 'express';
import { shutdownEnvironment } from '../../api/shutdown';

jest.mock('../../api/shutdown');

const app = express();
app.use(express.json());

// Add the routes to the test app
app.post('/api/shutdown', async (req, res) => {
  try {
    const result = await shutdownEnvironment();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error during shutdown'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

describe('API Server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('returns 200 OK with correct status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /api/shutdown', () => {
    it('successfully shuts down the environment', async () => {
      (shutdownEnvironment as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Environment shutdown successfully'
      });

      const response = await request(app)
        .post('/api/shutdown')
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Environment shutdown successfully'
      });
      expect(shutdownEnvironment).toHaveBeenCalled();
    });

    it('handles shutdown failure', async () => {
      (shutdownEnvironment as jest.Mock).mockRejectedValue(
        new Error('Shutdown failed')
      );

      const response = await request(app)
        .post('/api/shutdown')
        .send();

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Internal server error during shutdown'
      });
    });
  });
}); 