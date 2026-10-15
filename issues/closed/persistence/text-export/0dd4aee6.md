# title
Export committed database versions to reviewable text and offline HTML

# pre-condition
Database content and original-source overrides have stable versions.
Use isolated fixture copies, not live study notes or the user's active database.
선행 issue: df842f8f, 658b39eb

# steps
근거: FR-03, AC-03; issues/sources.md; docs/global-text-editing-plan.md.
1. Export the same DB twice; compare hashes; edit notes only; edit learning content; interrupt export and restart; open the generated offline HTML.
2. Capture and read the runtime evidence before judging PASS.

# actual result
PASS. Repeated exports are byte-identical; note-only saves leave HTML untouched. Pending exports resume in a worker after reopening. External edits are preserved; static-only hosting shows cached edits with persistence disabled; script injection stays inert. Evidence: {D_TEMP}/evidence/istqb/verification/0dd4aee6/exports.json, wrapper-proof.log. Summary: {D_TEMP}/evidence/istqb/verification/E_0dd4aee6.md.

# expected result
Identical DB versions yield identical text outputs; note-only saves do not rebuild HTML; content exports regenerate the offline view. Pending versions retry after interrupted output without corrupting files. External output edits are detected instead of silently overwritten. Git can show readable diffs and no automatic commit or push occurs. Record hashes and recovery outcomes in exports.json.
Evidence: {D_TEMP}/evidence/istqb/verification/0dd4aee6/. Completion summary: {D_TEMP}/evidence/istqb/verification/E_0dd4aee6.md.

# label
SQA_sk_0_0_0

# environment
OS: Windows; Node.js 22.5 or later; current Chrome/Edge.
hostname: N/A

# 담당자

agent_session_id: 01a13cdd-caf3-7743-80d0-d63cf51aaca3
