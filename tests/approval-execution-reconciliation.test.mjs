import test from "node:test";
import assert from "node:assert/strict";
import { reconcileApprovedExecutions } from "../src/approval-execution-reconciliation.mjs";

test("passes when every accepted approval has exactly one matching execution", () => {
  const report = reconcileApprovedExecutions({
    approvals: [
      { callId: "c1", tool: "deploy_change", status: "accepted" },
      { callId: "c2", tool: "deploy_other", status: "accepted" }
    ],
    executions: [
      { callId: "c1", tool: "deploy_change", outcome: "success" },
      { callId: "c2", tool: "deploy_other", outcome: "success" }
    ]
  });
  assert.equal(report.status, "PASS");
  assert.equal(report.summary.findings, 0);
});

test("detects an approved call that never appears in execution records", () => {
  const report = reconcileApprovedExecutions({
    approvals: [
      { callId: "c1", tool: "deploy_change", status: "accepted" },
      { callId: "c2", tool: "deploy_other", status: "accepted" }
    ],
    executions: [{ callId: "c1", tool: "deploy_change", outcome: "success" }]
  });
  assert.equal(report.status, "FAIL");
  assert.equal(report.summary.acceptedApprovalsMissingExecution, 1);
  assert.equal(report.findings[0].finding, "APPROVED_CALL_NOT_EXECUTED");
});

test("detects duplicate execution records for the same callId", () => {
  const report = reconcileApprovedExecutions({
    approvals: [{ callId: "c1", tool: "refund.create", status: "accepted" }],
    executions: [
      { callId: "c1", tool: "refund.create" },
      { callId: "c1", tool: "refund.create" }
    ]
  });
  assert.equal(report.status, "FAIL");
  assert.equal(report.summary.duplicateExecutions, 1);
});

test("detects execution with no approval", () => {
  const report = reconcileApprovedExecutions({
    approvals: [],
    executions: [{ callId: "c9", tool: "admin.deleteUser" }]
  });
  assert.equal(report.status, "FAIL");
  assert.ok(report.findings.some(f => f.finding === "EXECUTION_WITHOUT_APPROVAL"));
});

test("detects approved tool identity mismatch", () => {
  const report = reconcileApprovedExecutions({
    approvals: [{ callId: "c1", tool: "invoice.send", status: "accepted" }],
    executions: [{ callId: "c1", tool: "invoice.delete" }]
  });
  assert.equal(report.status, "FAIL");
  assert.ok(report.findings.some(f => f.finding === "APPROVED_TOOL_MISMATCH"));
});

test("does not treat a rejected approval as missing execution", () => {
  const report = reconcileApprovedExecutions({
    approvals: [{ callId: "c1", tool: "refund.create", status: "rejected" }],
    executions: []
  });
  assert.equal(report.status, "REVIEW");
  assert.equal(report.summary.acceptedApprovalsMissingExecution, 0);
});

test("rejects malformed input records", () => {
  assert.throws(() => reconcileApprovedExecutions({
    approvals: [{ tool: "refund.create", status: "accepted" }],
    executions: []
  }), /requires a non-empty callId/);
});
