# title
Recover whole-source replacements without loading application code

# pre-condition
Use isolated fixture copies, not live learner records. Existing catalogue editing is available.

# steps
근거: AC-RECOVERY; docs/all-strings-stories.md; user explicitly requested both stories and issue execution.
1. Inject file failure, terminate mid-write, detect later edits, restore a committed batch, and execute the independent recovery command with damaged source.
2. Capture actual runtime evidence and read it before closure.

# actual result
PASS. Original snapshots, mixed file/DB restore, subsequent-change conflicts, UNIQUE rollback, actual filesystem error rollback, interrupted journal recovery and standalone PowerShell restore with damaged source pass. Evidence: {D_TEMP}/evidence/istqb/verification/E_de45ec0b.md and de45ec0b/wrapper-proof.log.

# expected result
PASS when AC-RECOVERY in docs/all-strings-stories.md is verified using actual application code and isolated fixtures, including failures relevant to this scope. Evidence: {D_TEMP}/evidence/istqb/verification/de45ec0b/; summary: {D_TEMP}/evidence/istqb/verification/E_de45ec0b.md.

# label
SQA_sk_0_0_0

# environment
OS: Windows; Node.js 24; Chrome; local study web.
hostname: N/A

# 담당자

agent_session_id: 01a13cdd-caf3-7743-80d0-d63cf51aaca3
