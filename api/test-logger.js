export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return res.status(200).json({ error: 'Missing env vars', url: !!url, key: !!key });
  }

  try {
    const logRes = await fetch(`${url}/rest/v1/vercel_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'test-logger endpoint hit',
        source: 'serverless',
        project_id: 'wovely',
        request_path: '/api/test-logger',
        request_method: 'GET'
      })
    });
    const body = await logRes.text();
    return res.status(200).json({
      supabase_status: logRes.status,
      supabase_body: body,
      url_prefix: url.substring(0, 40),
      key_length: key.length
    });
  } catch (e) {
    return res.status(200).json({ error: e.message, stack: e.stack });
  }
}
