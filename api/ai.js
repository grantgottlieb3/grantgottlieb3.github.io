// api/ai.js — Vercel Edge Function for OpenAI OR OpenRouter
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
  catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { 'content-type': 'application/json', ...CORS }
    });
  }

  const { system = '', user = '', temperature = 0.8, model, provider } = bodyIn;

  // Choose provider based on env or explicit override
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

  if (useOpenRouter) {
    // OpenRouter attribution headers
    headers['HTTP-Referer'] = req.headers.get('origin') || 'https://grantgottlieb3.github.io';
    headers['X-Title'] = 'Spanish Immersion App';
  }

  const body = {
    model: model || (useOpenRouter ? 'openai/gpt-oss-20b:free' : 'gpt-oss-20b:free'),
    temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user',   content: user }
    ]
  };
  if (!useOpenRouter) body.response_format = { type: 'json_object' };

  const upstream = await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await upstream.text();

  // Try to coerce to JSON if possible, but mirror upstream status always
  let out = text;
  try { out = JSON.parse(text); } catch (_) {}

  return new Response(typeof out === 'string' ? out : JSON.stringify(out), {
    status: upstream.status,
    headers: { 'content-type': 'application/json', ...CORS }
  });
}
