async function writeLog({ level = 'info', message, request_path, request_method, status_code, user_id = null, context = null }) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Hard bail if env vars missing — can't log without them
  if (!url || !key) {
    console.error('[logger] Missing env vars — url:', !!url, 'key:', !!key);
    return;
  }

  try {
    const logRes = await fetch(`${url}/rest/v1/vercel_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': String(key),
        'Authorization': `Bearer ${String(key)}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        source: 'serverless',
        request_path: request_path || '',
        request_method: request_method || '',
        status_code: status_code || 0,
        user_id: user_id || null,
        context: context || null,
        project_id: 'wovely'
      })
    });
    const responseText = await logRes.text();
    if (logRes.status >= 300) {
      console.error('[logger] Supabase rejected write:', logRes.status, responseText.substring(0, 300));
    }
  } catch (e) {
    console.error('[logger] FETCH THREW:', e.constructor.name, '—', e.message);
  }
}

export function withLogging(handler) {
  return async function(req, res) {
    const start = Date.now();
    const path = req.url || '';
    const method = req.method || '';

    // Patch res.json to capture status
    const originalJson = res.json.bind(res);
    let capturedStatus = 200;
    res.json = (body) => {
      capturedStatus = res.statusCode || 200;
      return originalJson(body);
    };

    const originalStatus = res.status.bind(res);
    res.status = (code) => {
      capturedStatus = code;
      return originalStatus(code);
    };

    try {
      await handler(req, res);
      const duration = Date.now() - start;

      // Await so Vercel doesn't kill the function before the log write completes
      await writeLog({
        level: capturedStatus >= 400 ? 'error' : 'info',
        message: `${method} ${path} → ${capturedStatus} (${duration}ms)`,
        request_path: path,
        request_method: method,
        status_code: capturedStatus,
        context: { duration_ms: duration }
      });
    } catch (err) {
      const duration = Date.now() - start;

      // Try to send error response if not already sent
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }

      await writeLog({
        level: 'error',
        message: `UNHANDLED: ${method} ${path} — ${err.message}`,
        request_path: path,
        request_method: method,
        status_code: 500,
        context: { error: err.message, stack: err.stack, duration_ms: duration }
      });
    }
  };
}

export { writeLog };
