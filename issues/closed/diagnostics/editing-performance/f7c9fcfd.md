# title
Verify editor latency and regressions against the current baseline

# pre-condition
Before changing runtime code, capture a reproducible baseline using isolated copies of the current app and user-content sizes.
Use isolated fixture copies, not live study notes or the user's active database.
선행 issue: 35b70340, df842f8f, 0dd4aee6, 4b54a063, 6d4cc8a9, c7e393ca, 0d0e9213, 1ab3fe73, 65e04896, 658b39eb

# steps
근거: FR-10, AC-10; issues/sources.md; docs/global-text-editing-plan.md.
1. Measure five warm runs on the same browser and machine for current-size and 100KB notes, the real content inventory, and 1000 global matches. Exercise Korean IME, paste, Ctrl+D, Ctrl+Shift+L, wrapping, undo and typing during save.
2. Capture and read the runtime evidence before judging PASS.

# actual result
PASS. Five-probe p95: 9KB notes 54.8ms versus 58.5ms baseline; 101KB notes 61.8ms versus 55.3ms (+6.5ms); 1000 occurrences 73.9ms. Save p95: notes 32.8ms, 27-record batch 37.9ms. Existing editing regressions passed with documented browser/event methods. Evidence: {D_TEMP}/evidence/istqb/verification/f7c9fcfd/performance.json, wrapper-proof.log. Summary: {D_TEMP}/evidence/istqb/verification/E_f7c9fcfd.md.

# expected result
Input-to-next-paint p95 is at most 100ms; ordinary-note p95 increase is at most 10ms over baseline; local DB save response p95 is at most 500ms after a typing burst of at least two seconds. Measure 400ms debounce, export and HTML build separately. Every listed existing editor behavior remains correct; failed targets remain open. Record environment, raw samples, baseline and comparisons in performance.json and regression.json.
Evidence: {D_TEMP}/evidence/istqb/verification/f7c9fcfd/. Completion summary: {D_TEMP}/evidence/istqb/verification/E_f7c9fcfd.md.

# label
SQA_sk_0_0_0

# environment
OS: Windows; Node.js 22.5 or later; current Chrome/Edge.
hostname: N/A

# 담당자

agent_session_id: 01a13cdd-caf3-7743-80d0-d63cf51aaca3
