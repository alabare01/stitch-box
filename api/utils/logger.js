const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function writeLog({ level = 'info', message, request_path, request_method, status_code, user_id = null, context = null }) {
  console.log('[logger] writeLog called:', message, 'URL:', SUPABASE_URL ? 'SET' : 'UNDEFINED', 'KEY:', SUPABASE_SERVICE_KEY ? 'SET' : 'UNDEFINED');
  try {
    const logRes = await fetch(`${SUPABASE_URL}/rest/v1/vercel_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        source: 'serverless',
        request_path,
        request_method,
        status_code,
        user_id,
        context,
        project_id: 'wovely'
      })
    });
    console.log('[logger] Supabase response status:', logRes.status);
  } catch (e) {
    console.error('[logger] Logger write failed:', e.message, e.stack);
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
