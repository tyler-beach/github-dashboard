import express from 'express';
import { shutdownEnvironment } from '../api/shutdown';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// Shutdown endpoint
app.post('/api/shutdown', async (req, res) => {
  try {
    const result = await shutdownEnvironment();
    res.json(result);
  } catch (error) {
    console.error('Error in shutdown endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during shutdown'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
}); 