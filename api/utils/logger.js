export async function writeLog(supabaseUrl, serviceKey, data) {
  if (!supabaseUrl || !serviceKey) return;
  try {
    await fetch(`${supabaseUrl}/rest/v1/vercel_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        source: 'serverless',
        project_id: 'wovely',
        ...data
      })
    });
  } catch (e) {
    // silent fail
  }
}
