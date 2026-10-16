import test from "node:test";
import assert from "node:assert/strict";
import { runSampleAssessment } from "../src/assessment-runner.mjs";

test("sample assessment is reproducible and explicitly fixture-only", () => {
  const report = runSampleAssessment();
  assert.equal(report.assessmentId, "AUR-SAMPLE-0001");
  assert.equal(report.scope.liveAgentTested, false);
  assert.equal(report.scope.externalSystemsContacted, false);
  assert.equal(report.summary.total, 5);
  assert.equal(report.summary.fail, 5);
  assert.equal(report.summary.pass, 0);
  for (const result of report.results) {
    assert.equal(result.expected, "DENY");
    assert.equal(result.observed, "ALLOW");
    assert.equal(result.outcome, "FAIL");
    assert.equal(result.evidence.externalExecution, false);
    assert.equal(result.evidence.externalSideEffects, false);
    assert.ok(result.evidence.toolCall);
  }
});
