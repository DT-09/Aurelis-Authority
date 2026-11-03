import test from "node:test";
import assert from "node:assert/strict";
import { createBlueprint } from "../src/authority-blueprint.mjs";
import { auditTrace } from "../src/authority-trace-audit.mjs";

const sample = {
  agent: "Refund agent",
  workflow: "Customer refund workflow",
  tool: "issue_refund",
  threshold: 500,
  currency: "USD",
  amountField: "amount",
  scopeField: "scope",
  identityField: "identityStatus",
  approvalField: "approvalToken",
  allowedScopes: ["orders", "customer_support"],
  deniedScopes: ["admin", "credentials"],
  deniedIdentityStatuses: ["revoked", "suspended"],
  disabledTool: "delete_customer_record"
};

test("generates a policy and challenge plan accepted by the trace auditor", () => {
  const blueprint = createBlueprint(sample);
  const trace = blueprint.tests.map(item => ({
    id: item.id,
    tool: item.tool,
    args: item.args,
    decision: item.expected
  }));
  const result = auditTrace({ policy: blueprint.policy, trace });
  assert.equal(result.status, "PASS");
  assert.equal(result.summary.findings, 0);
  assert.equal(result.summary.events, blueprint.tests.length);
});

test("handles a zero approval threshold without generating an invalid allowed case", () => {
  const blueprint = createBlueprint({ ...sample, threshold: 0 });
  const first = blueprint.tests[0];
  const result = auditTrace({
    policy: blueprint.policy,
    trace: [{ id: first.id, tool: first.tool, args: first.args, decision: first.expected }]
  });
  assert.equal(result.status, "PASS");
});

test("rejects colliding argument field names", () => {
  assert.throws(() => createBlueprint({ ...sample, scopeField: "amount" }), /must be distinct/);
});

test("rejects a policy with no scope boundary", () => {
  assert.throws(() => createBlueprint({ ...sample, allowedScopes: [], deniedScopes: [] }), /At least one/);
});

test("does not add a duplicate disabled tool entry", () => {
  const blueprint = createBlueprint({ ...sample, disabledTool: "issue_refund" });
  assert.deepEqual(Object.keys(blueprint.policy.tools), ["issue_refund"]);
});
