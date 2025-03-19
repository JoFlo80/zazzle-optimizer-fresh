import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const port = 3000;

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('Missing OpenAI API Key. Please check .env file.');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OpenAI proxy endpoint
app.post('/api/openai', async (req, res) => {
  try {
    console.log('Received OpenAI request:', {
      model: req.body.model,
      messageCount: req.body.messages?.length
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    console.log('OpenAI response received:', {
      status: response.status,
      choices: data.choices?.length
    });

    res.json(data);
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`
🚀 Server is running at http://localhost:${port}
📝 API endpoint: http://localhost:${port}/api/openai
❤️  Health check: http://localhost:${port}/health
  `);
});