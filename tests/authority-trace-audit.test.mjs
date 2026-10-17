import test from "node:test";
import assert from "node:assert/strict";
import { auditTrace } from "../src/authority-trace-audit.mjs";

const policy = {
  version: 1,
  tools: {
    "refund.create": {
      enabled: true,
      amountField: "amount",
      maxWithoutApproval: 500,
      approvalField: "approvalToken"
    },
    "customer_record.read": {
      enabled: true,
      scopeField: "scope",
      allowedScopes: ["profile", "orders"],
      deniedScopes: ["restricted"]
    },
    "invoice.send": {
      enabled: true,
      identityStatusField: "identityStatus",
      deniedIdentityStatuses: ["revoked"]
    }
  }
};

test("allows an in-policy refund", () => {
  const report = auditTrace({
    policy,
    trace: [{ id: "ok", tool: "refund.create", args: { amount: 250 }, decision: "ALLOW" }]
  });
  assert.equal(report.status, "PASS");
  assert.equal(report.summary.matched, 1);
  assert.equal(report.summary.unexpectedAllows, 0);
});

test("flags an observed allow when approval is required", () => {
  const report = auditTrace({
    policy,
    trace: [{ id: "high-refund", tool: "refund.create", args: { amount: 900 }, decision: "ALLOW" }]
  });
  assert.equal(report.status, "FAIL");
  assert.equal(report.summary.unexpectedAllows, 1);
  assert.equal(report.findings[0].policyReason, "approval_required");
  assert.equal(report.findings[0].severity, "CRITICAL");
});

test("accepts an above-threshold refund with an approval token", () => {
  const report = auditTrace({
    policy,
    trace: [{ tool: "refund.create", args: { amount: 900, approvalToken: "approved-by-human" }, decision: "ALLOW" }]
  });
  assert.equal(report.status, "PASS");
});

test("flags restricted data access that was observed as allowed", () => {
  const report = auditTrace({
    policy,
    trace: [{ tool: "customer_record.read", args: { scope: "restricted" }, decision: "ALLOW" }]
  });
  assert.equal(report.findings[0].policyReason, "scope_not_allowed");
  assert.equal(report.summary.unexpectedAllows, 1);
});

test("denies unconfigured tools by default", () => {
  const report = auditTrace({
    policy,
    trace: [{ tool: "admin.export_all", args: {}, decision: "ALLOW" }]
  });
  assert.equal(report.findings[0].policyReason, "tool_not_enabled");
  assert.equal(report.summary.unexpectedAllows, 1);
});

test("flags revoked identity use", () => {
  const report = auditTrace({
    policy,
    trace: [{ tool: "invoice.send", args: { identityStatus: "revoked" }, decision: "ALLOW" }]
  });
  assert.equal(report.findings[0].policyReason, "identity_status_denied");
});

test("reports an unexpected deny as a review warning, not an authorization breach", () => {
  const report = auditTrace({
    policy,
    trace: [{ tool: "refund.create", args: { amount: 100 }, decision: "DENY" }]
  });
  assert.equal(report.status, "REVIEW");
  assert.equal(report.summary.unexpectedDenies, 1);
  assert.equal(report.findings[0].severity, "WARNING");
});

test("rejects malformed trace decisions", () => {
  assert.throws(() => auditTrace({
    policy,
    trace: [{ tool: "refund.create", args: { amount: 100 }, decision: "MAYBE" }]
  }), /decision must be ALLOW or DENY/);
});
