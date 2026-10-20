import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/assessment.js";

test("assessment endpoint executes a fresh isolated mock assessment", async () => {
  const response = await onRequestPost();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.match(response.headers.get("cache-control"), /no-store/);

  const report = await response.json();
  assert.equal(report.status, "DEMONSTRATION_ONLY");
  assert.equal(report.scope.liveAgentTested, false);
  assert.equal(report.scope.externalSystemsContacted, false);
  assert.equal(report.scope.externalNetwork, false);
  assert.equal(report.scope.externalSideEffects, false);
  assert.equal(report.summary.baseline.total, 5);
  assert.equal(report.summary.baseline.fail, 5);
  assert.equal(report.summary.retest.pass, 5);
  assert.equal(report.cases.length, 5);
  for (const row of report.cases) {
    assert.ok(row.trace.length > 0);
    assert.ok(row.retest.trace.length > 0);
    assert.equal(row.observed, "ALLOW");
    assert.equal(row.execution.boundaryEnforced, false);
    assert.equal(row.retest.observed, "DENY");
    assert.equal(row.retest.boundaryEnforced, true);
    assert.equal(row.retest.externalSideEffects, false);
  }
});
