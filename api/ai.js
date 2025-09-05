// api/ai.js — Vercel Edge Function (no Node libs needed)
export const config = { runtime: 'edge' };

// CORS: allow your site to call this from anywhere (tighten if you want)
const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type'
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  try {
    const { system = '', user = '', temperature = 0.8, model = 'gpt-4o-mini' } = await req.json();

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // Your key stays on the server (set it in Vercel → Environment Variables)
        'authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });

    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content || '{}';

    // Return JSON text (your frontend already handles string/object)
    return new Response(content, {
      status: r.ok ? 200 : 400,
      headers: { 'content-type': 'application/json', ...cors }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Proxy error', detail: String(e) }), {
      status: 500, headers: { 'content-type': 'application/json', ...cors }
    });
  }
}
