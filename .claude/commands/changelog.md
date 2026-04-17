---
description: Draft the next session's CHANGELOG entry from recent commits and present it for review.
argument-hint: [session-number]
---

You are drafting a new entry for `src/changelog.js`. Your job is to summarize the user-facing changes from this session in Bev voice.

## Steps

1. If `$1` is set, use it as the session number. Otherwise read `WOVELY_CONTEXT.md` and use the value after "Current session:". If neither is available, ask.
2. Determine the commit range. Run `git log --oneline --no-merges main..HEAD` to see commits on this branch. If empty, run `git log --oneline --no-merges -20` and ask which commits belong to this session.
3. Read the existing `src/changelog.js` to match the voice, format, and emoji conventions. Study the most recent 3 entries closely.
4. Draft a new entry at the top of the `CHANGELOG` array with:
   - `version: "Session N"` (use the session number from step 1)
   - `date: "YYYY-MM-DD"` (today's date)
   - `updates: [...]` — 2 to 5 bullets, each with an `emoji` and `text`
5. **Filter rules — exclude anything not user-facing:**
   - No internal tools (founders dashboard, analytics, observability, log plumbing)
   - No infrastructure changes (Vercel config, env vars, CI, branches)
   - No refactors, dependency bumps, or dev-only work
   - Include: UI changes, feature additions, user-visible bug fixes, copy changes Danielle or another user would notice
6. **Voice rules:**
   - Bev language — never mention AI, Claude, Gemini, or any model name
   - Frame intelligence as Bev's work ("Bev untangles it", not "our AI retries")
   - Keep bullets under ~100 chars
   - Match the warmth of the existing entries
7. Show me the drafted entry as a code block. Do NOT write to the file yet.
8. After I approve (or after I give edits), prepend the entry to `src/changelog.js`.
9. Show `git diff src/changelog.js` and stop. Do not commit. I commit it myself.

## Notes

- If this is the first commit on a new session and there's nothing substantive yet, say so rather than inventing content.
- If I give you rough notes alongside the command (e.g. `/changelog 52 "shipped X, fixed Y"`), treat them as additional context on top of the git log.
