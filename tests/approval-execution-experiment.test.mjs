import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { auditTrace } from "../src/authority-trace-audit.mjs";
import { reconcileApprovedExecutions } from "../src/approval-execution-reconciliation.mjs";

test("decision-only audit passes supplied events while reconciliation catches the missing approved call", async () => {
  const input = JSON.parse(await readFile(new URL("./fixtures/approval-execution-gap.json", import.meta.url), "utf8"));
  const baseline = auditTrace({ policy: input.policy, trace: input.decisionTrace });
  const reconciled = reconcileApprovedExecutions({ approvals: input.approvals, executions: input.executions });

  assert.equal(baseline.status, "PASS");
  assert.equal(baseline.summary.findings, 0);
  assert.equal(reconciled.status, "FAIL");
  assert.ok(reconciled.findings.some(f =>
    f.finding === input.expectedFinding && f.id === input.expectedMissingCallId
  ));
});

test("the experiment fixture has unique call IDs and intentionally omits one accepted execution", async () => {
  const input = JSON.parse(await readFile(new URL("./fixtures/approval-execution-gap.json", import.meta.url), "utf8"));
  const approvedIds = input.approvals.map(a => a.callId);
  const executedIds = input.executions.map(e => e.callId);
  assert.equal(new Set(approvedIds).size, approvedIds.length);
  assert.equal(new Set(executedIds).size, executedIds.length);
  assert.equal(approvedIds.length, 2);
  assert.equal(executedIds.length, 1);
  assert.ok(approvedIds.includes(input.expectedMissingCallId));
  assert.ok(!executedIds.includes(input.expectedMissingCallId));
});
