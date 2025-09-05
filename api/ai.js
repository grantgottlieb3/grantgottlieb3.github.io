// api/ai.js — Vercel Edge Function that supports OpenAI OR OpenRouter
export const config = { runtime: 'edge' };

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type'
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: true, msg: 'POST JSON to this endpoint' }), {
      status: 200, headers: { 'content-type': 'application/json', ...CORS }
    });
  }

  let bodyIn;
  try { bodyIn = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'content-type':'application/json', ...CORS } }); }

  const {
    system = '', user = '', temperature = 0.8,
    // If you pass a model from the client we’ll use it; otherwise we pick sane defaults
    model,
    // Optional override: 'openrouter' | 'openai'
    provider
  } = bodyIn;

  // Decide provider:
  const envProvider = process.env.AI_PROVIDER || (process.env.OPENROUTER_API_KEY ? 'openrouter' : 'openai');
  const useOpenRouter = (provider || envProvider) === 'openrouter';

  const baseUrl = useOpenRouter
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';

  const apiKey = useOpenRouter ? process.env.OPENROUTER_API_KEY : process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API key on server' }), {
      status: 500, headers: { 'content-type': 'application/json', ...CORS }
    });
  }

  const headers = {
    'content-type': 'application/json',
    'authorization': `Bearer ${apiKey}`
  };

  // OpenRouter recommends these headers (used for attribution/rate fairness)
  if (useOpenRouter) {
    const referer = req.headers.get('origin') || 'https://vercel.com/grants-projects-8848af2d/grantgottlieb3-github-io/4HemXyqS8pUC1XQ4cMq4nnVJyAgV';
    headers['HTTP-Referer'] = referer;
    headers['X-Title'] = 'Spanish Immersion App';
  }

  const requestBody = {
    model: model || (useOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini'),
    temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  };
  // Some OpenRouter models don’t support response_format; keep it OpenAI-only to be safe
  if (!useOpenRouter) requestBody.response_format = { type: 'json_object' };

  const r = await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(requestBody) });
  const data = await r.json();
  const content = data?.choices?.[0]?.message?.content ?? '';

  // Try to return a JSON object if the model produced JSON; otherwise return the raw string
  let out = content;
  try { out = JSON.parse(content); } catch (_) {}
  return new Response(typeof out === 'string' ? out : JSON.stringify(out), {
    status: r.ok ? 200 : 400,
    headers: { 'content-type': 'application/json', ...CORS }
  });
}
