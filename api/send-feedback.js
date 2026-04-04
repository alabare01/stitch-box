// api/send-feedback.js
// Accepts user feedback, stores in Supabase, sends formatted email via Resend
// Env vars: SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL, RESEND_API_KEY

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function buildSubject(category, severity, email, page) {
  const from = email || 'anonymous';
  if (category === 'Bug') return `🐛 ${severity ? `[${severity}] ` : ''}Bug from ${from} on ${page || '/'}`;
  if (category === 'Idea') return `💡 New Idea from ${from}`;
  if (category === 'Love it') return `❤️ Love Note from ${from}`;
  return `New ${category} from ${from}`;
}

function buildEmailBody(data) {
  const { category, message, stepsToReproduce, expectedBehavior, severity, email, page, browser, device, screenSize } = data;
  const lines = [];
  lines.push(`Category: ${category}`);
  lines.push(`From: ${email || 'anonymous'}`);
  lines.push(`Page: ${page || '/'}`);
  lines.push('');

  if (category === 'Bug') {
    lines.push('── What went wrong ──');
    lines.push(message);
    if (stepsToReproduce) { lines.push(''); lines.push('── Steps to reproduce ──'); lines.push(stepsToReproduce); }
    if (expectedBehavior) { lines.push(''); lines.push('── Expected behavior ──'); lines.push(expectedBehavior); }
    if (severity) { lines.push(''); lines.push(`Severity: ${severity}`); }
    lines.push('');
    lines.push('── Device Info ──');
    lines.push(`Browser: ${browser || 'unknown'}`);
    lines.push(`Device: ${device || 'unknown'}`);
    lines.push(`Screen: ${screenSize || 'unknown'}`);
  } else if (category === 'Idea') {
    lines.push('── The Idea ──');
    lines.push(message);
    if (stepsToReproduce) { lines.push(''); lines.push('── How it would help ──'); lines.push(stepsToReproduce); }
  } else {
    lines.push(message);
  }

  lines.push('');
  lines.push(`Submitted: ${new Date().toISOString()}`);
  return lines.join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, email, category, message, stepsToReproduce, expectedBehavior, severity, page, browser, device, screenSize } = req.body;

    if (!category || !message) {
      return res.status(400).json({ error: 'Category and message are required' });
    }

    const { error: dbError } = await supabase
      .from('feedback')
      .insert({
        user_id: userId || null,
        email: email || null,
        category,
        message,
        steps_to_reproduce: stepsToReproduce || null,
        expected_behavior: expectedBehavior || null,
        severity: severity || null,
        page: page || null,
        browser: browser || null,
        device: device || null,
        screen_size: screenSize || null,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('[send-feedback] Supabase insert error:', dbError.message);
      return res.status(500).json({ error: 'Failed to save feedback' });
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Wovely Feedback <support@wovely.app>',
        to: 'support@wovely.app',
        subject: buildSubject(category, severity, email, page),
        text: buildEmailBody(req.body)
      })
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('[send-feedback] Resend error:', errText);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[send-feedback] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
