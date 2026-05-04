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
    const { app_name, failures, html, iteration } = req.body;

    if (!app_name || !failures || !html) {
      return res.status(400).json({ error: 'app_name, failures, and html are required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    }

    const failureList = Array.isArray(failures) 
      ? failures.map(f => f.name || f).join(', ')
      : failures;

    const prompt = `Fix the following issues in this HTML/JavaScript application:

Failed Checks: ${failureList}

Original HTML (first 2000 chars):
${html.substring(0, 2000)}...

Generate ONLY the complete fixed HTML document. Do not explain. Start with <!DOCTYPE html>`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 8000,
    }, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    });

    const fixedHtml = response.data.choices[0]?.message?.content || '';

    return res.status(200).json({
      status: 'success',
      app_name,
      iteration,
      fixed_html: fixedHtml,
      failures_addressed: failureList,
      tokens_used: response.data.usage?.total_tokens || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[/api/fix] Error:', error.message);
    return res.status(500).json({
      status: 'error',
      step: 'fix',
      message: error.message,
    });
  }
}