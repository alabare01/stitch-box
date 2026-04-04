import { writeLog } from './utils/logger.js';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, source, stack, user_id, context } = req.body || {};

  await writeLog({
    level: 'error',
    message: `CLIENT ERROR: ${message || 'unknown'}${source ? ` @ ${source}` : ''}`,
    request_path: source || 'client',
    request_method: 'CLIENT',
    status_code: 0,
    user_id: user_id || null,
    context: { stack, ...context }
  });

  res.status(200).json({ ok: true });
}

export default handler;
