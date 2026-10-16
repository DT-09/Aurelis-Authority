import test from "node:test";
import assert from "node:assert/strict";
import { demoConfig, executeDemoAgent } from "../src/demo-agent.mjs";
import { runSampleAssessment } from "../src/assessment-runner.mjs";

test("vulnerable agent execution path attempts tool calls and records observed acceptance", () => {
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

test("enforced mock gateway blocks every configured boundary violation", () => {
  for (const scenario of demoConfig.scenarios) {
    const run = executeDemoAgent(scenario, { enforcePolicy: true, runId: "test-retest" });
    assert.equal(run.attempted, true);
    assert.equal(run.toolAccepted, false);
    assert.equal(run.observed, "DENY");
    assert.equal(run.boundaryEnforced, true);
    assert.equal(run.sideEffect, false);
    assert.ok(run.trace.some(e => e.event === "mock_tool.blocked"));
  }
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
