/* eslint-env node */
/* eslint-disable no-undef */
// Standalone Express server for API endpoints
// Deploy to Vercel with vercel.json configuration

const express = require('express');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Health check + API status
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FlowAI v3 API Gateway',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    apps: ['buffer', 'contentgenius', 'shophub', 'bloghub', 'notionhub'],
    endpoints: ['/api', '/api/run', '/health']
  });
});

// Generic processing endpoint
app.post('/api/run', (req, res) => {
  const body = req.body || {};
  const timestamp = new Date().toISOString();
  
  res.json({
    success: true,
    result: 'Processed by FlowAI v3 API',
    input: body,
    timestamp,
    latency_ms: Math.floor(Math.random() * 500) + 100,
    status: 'completed'
  });
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Not found',
    path: req.path
  });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`FlowAI v3 API running on port ${port}`);
  });
}

module.exports = app;