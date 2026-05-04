/* eslint-env node */
/* global process */
import axios from 'axios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { app_name, context, tech_stack = [], ui_components = [], api_endpoints = [] } = req.body;

    if (!app_name || !context) {
      return res.status(400).json({ error: 'app_name and context are required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    }

    const prompt = `Generate a complete, production-ready HTML/JavaScript application.

App Name: ${app_name}
Description: ${context}
Tech Stack: ${tech_stack.join(', ') || 'HTML, Tailwind CSS, JavaScript'}
Components: ${ui_components.join(', ') || 'Auto-detect'}
APIs: ${api_endpoints.join(', ') || 'GET /api, POST /api/run'}

Requirements:
1. Single HTML file with embedded CSS and JS
2. Dark theme (bg-gray-950, text-gray-100)
3. localStorage persistence
4. Create/Read/Update/Delete workflows
5. Form validation
6. Responsive design

Return ONLY valid HTML document starting with <!DOCTYPE html>`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 8000,
    }, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    });

    const htmlContent = response.data.choices[0]?.message?.content || '';
    if (!htmlContent.includes('<!DOCTYPE') && !htmlContent.includes('<html')) {
      throw new Error('Invalid HTML generated');
    }

    return res.status(200).json({
      status: 'success',
      app_name,
      html: htmlContent,
      tokens_used: response.data.usage?.total_tokens || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[/api/generate] Error:', error.message);
    return res.status(500).json({
      status: 'error',
      step: 'generate',
      message: error.message,
    });
  }
}