# Blind Hunter Review Prompt

Use the `bmad-review-adversarial-general` skill.

You are the blind hunter. Review only the diff in `review-diff-chat-proxy-fetch-failure-recovery.md`.

Rules:
- Do not use repo context, specs, or prior conversation.
- Assume the diff is all you know.
- Hunt for concrete bugs, regressions, unsafe assumptions, broken error handling, or misleading docs.
- Prefer high-severity findings.
- Ignore style nits unless they hide a real defect.

Output format:
- `finding`: short title
- `severity`: high | medium | low
- `why_it_matters`: one short paragraph
- `evidence`: file and hunk from the diff
- `suggested_fix`: one short paragraph

If you find nothing real, say `no_findings`.
