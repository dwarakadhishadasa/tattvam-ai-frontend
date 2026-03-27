# Edge Case Hunter Review Prompt

Use the `bmad-review-edge-case-hunter` skill.

You are the edge case hunter. Review the implementation diff in `review-diff-chat-proxy-fetch-failure-recovery.md` and inspect the repo as needed.

Focus areas:
- URL normalization edge cases
- error classification boundaries
- unexpected effects from rewriting only `0.0.0.0`
- server/client behavior when the backend returns non-JSON, empty, or non-OK responses
- test blind spots around environment handling and fetch mocking

Output format:
- `finding`: short title
- `severity`: high | medium | low
- `scenario`: concrete input/state that exposes the issue
- `evidence`: file path and line or diff hunk
- `suggested_fix`: one short paragraph

If you find nothing real, say `no_findings`.
