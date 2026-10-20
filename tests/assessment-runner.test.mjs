import test from "node:test";
import assert from "node:assert/strict";
import { demoConfig, executeDemoAgent } from "../src/demo-agent.mjs";
import { invokeMockTool } from "../src/policy-gateway.mjs";
import { runSampleAssessment } from "../src/assessment-runner.mjs";

test("vulnerable execution path records attempted calls accepted while enforcement is disabled", () => {
  for (const scenario of demoConfig.scenarios) {
    const run = executeDemoAgent(scenario, { enforcePolicy: false, runId: "test-baseline" });
    assert.equal(run.attempted, true);
    assert.equal(run.toolAccepted, true);
    assert.equal(run.observed, "ALLOW");
    assert.equal(run.boundaryEnforced, false);
    assert.equal(run.sideEffect, false);
    assert.ok(run.trace.some(e => e.event === "agent.tool_call_attempted"));
    assert.ok(run.trace.some(e => e.event === "mock_tool.accepted"));
  }
});

test("enforced gateway blocks every configured boundary violation before tool acceptance", () => {
  for (const scenario of demoConfig.scenarios) {
    const run = executeDemoAgent(scenario, { enforcePolicy: true, runId: "test-retest" });
    assert.equal(run.attempted, true);
    assert.equal(run.toolAccepted, false);
    assert.equal(run.observed, "DENY");
    assert.equal(run.boundaryEnforced, true);
    assert.equal(run.sideEffect, false);
    assert.ok(run.trace.some(e => e.event === "mock_tool.blocked" && e.toolReceivedAcceptedCall === false));
  }
});

test("enforced gateway denies unknown tools and malformed arguments by default", () => {
  const unknown = invokeMockTool({ action: "admin.deleteUser", args: { userId: "fixture-user" } }, { enforcePolicy: true });
  assert.equal(unknown.accepted, false);
  assert.equal(unknown.reason, "tool_not_allowlisted");

  const malformed = invokeMockTool({ action: "refund.create", args: { amount: "4500", approvalToken: null } }, { enforcePolicy: true });
  assert.equal(malformed.accepted, false);
  assert.equal(malformed.reason, "invalid_arguments");

  const negative = invokeMockTool({ action: "purchase.submit", args: { amount: -1, approval: null } }, { enforcePolicy: true });
  assert.equal(negative.accepted, false);
  assert.equal(negative.reason, "invalid_arguments");
});

test("report derives outcomes from execution observations and includes trace, remediation, and retest", () => {
  const report = runSampleAssessment({ generatedAt: "2026-10-16T12:00:00.000Z" });
  assert.equal(report.status, "DEMONSTRATION_ONLY");
  assert.equal(report.scope.externalNetwork, false);
  assert.equal(report.scope.externalSideEffects, false);
  assert.equal(report.summary.baseline.total, 5);
  assert.equal(report.summary.baseline.fail, 5);
  assert.equal(report.summary.retest.pass, 5);
  assert.equal(report.summary.retest.fail, 0);
  for (const c of report.cases) {
    assert.equal(c.expected, "DENY");
    assert.equal(c.observed, "ALLOW");
    assert.equal(c.outcome, c.observed === c.expected ? "PASS" : "FAIL");
    assert.ok(c.trace.length >= 4);
    assert.ok(c.remediation.length > 10);
    assert.equal(c.retest.observed, "DENY");
    assert.equal(c.retest.outcome, c.retest.observed === c.retest.expected ? "PASS" : "FAIL");
    assert.equal(c.retest.externalSideEffects, false);
  }
});


test("enforcement is fail-closed by default", () => {
  const scenario = demoConfig.scenarios[0];
  const run = executeDemoAgent(scenario, { runId: "test-default-enforcement" });
  assert.equal(run.observed, "DENY");
  assert.equal(run.toolAccepted, false);
  assert.equal(run.boundaryEnforced, true);
  assert.equal(run.sideEffect, false);
});

test("enforced gateway allows compliant actions and verified demo approvals", () => {
  const smallRefund = invokeMockTool({
    action: "refund.create",
    args: { amount: 250, approvalToken: null }
  });
  assert.equal(smallRefund.decision, "ALLOW");
  assert.equal(smallRefund.accepted, true);
  assert.equal(smallRefund.boundaryEnforced, true);

  const approvedRefund = invokeMockTool({
    action: "refund.create",
    args: { amount: 4500, approvalToken: "mock-human-approval-valid" }
  });
  assert.equal(approvedRefund.decision, "ALLOW");
  assert.equal(approvedRefund.accepted, true);
  assert.equal(approvedRefund.boundaryEnforced, true);
});

test("arbitrary approval strings do not satisfy the demo approval boundary", () => {
  const result = invokeMockTool({
    action: "refund.create",
    args: { amount: 4500, approvalToken: "anything-at-all" }
  });
  assert.equal(result.decision, "DENY");
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "policy_boundary_violation");
});
