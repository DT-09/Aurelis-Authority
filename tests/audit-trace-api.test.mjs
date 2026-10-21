import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/audit-trace.js";

const policy = {
  version: 1,
  tools: {
    "refund.create": {
      enabled: true,
      amountField: "amount",
      maxWithoutApproval: 500,
      approvalField: "approvalToken"
    }
  }
};

function request(body, contentType = "application/json") {
  return new Request("https://example.test/api/audit-trace", {
    method: "POST",
    headers: { "content-type": contentType },
    body
  });
}

test("audits supplied decisions and returns an unexpected allow finding", async () => {
  const response = await onRequestPost({
    request: request(JSON.stringify({
      policy,
      trace: [{ id: "case-1", tool: "refund.create", args: { amount: 4500, approvalToken: null }, decision: "ALLOW" }]
    }))
  });
  assert.equal(response.status, 200);
  const report = await response.json();
  assert.equal(report.status, "FAIL");
  assert.equal(report.summary.unexpectedAllows, 1);
  assert.equal(report.findings[0].finding, "UNEXPECTED_ALLOW");
  assert.equal(report.scope.toolsExecuted, false);
  assert.equal(report.inputHandling.persisted, false);
});

test("rejects malformed JSON", async () => {
  const response = await onRequestPost({ request: request("{") });
  assert.equal(response.status, 400);
});

test("rejects non-JSON content types", async () => {
  const response = await onRequestPost({ request: request("{}", "text/plain") });
  assert.equal(response.status, 415);
});

test("rejects invalid trace schema", async () => {
  const response = await onRequestPost({ request: request(JSON.stringify({ policy, trace: [{ tool: "refund.create", args: {}, decision: "MAYBE" }] })) });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error, "Trace audit could not be completed.");
  assert.ok(body.detail);
});

test("rejects oversized request bodies", async () => {
  const response = await onRequestPost({ request: request(" ".repeat(1_000_001)) });
  assert.equal(response.status, 413);
});
