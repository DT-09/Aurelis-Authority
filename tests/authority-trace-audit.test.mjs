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

test("accepts an above-threshold refund when an approval value is present", () => {
  const report = auditTrace({
    policy,
    trace: [{ tool: "refund.create", args: { amount: 900, approvalToken: "approved-by-human" }, decision: "ALLOW" }]
  });
  assert.equal(report.status, "PASS");
  assert.match(report.limitations.at(-1), /do not authenticate the approver/);
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

test("fails closed when a configured scope field is missing", () => {
  const scopeOnlyPolicy = {
    version: 1,
    tools: {
      "record.read": { enabled: true, deniedScopes: ["restricted"] }
    }
  };
  const report = auditTrace({
    policy: scopeOnlyPolicy,
    trace: [{ tool: "record.read", args: {}, decision: "ALLOW" }]
  });
  assert.equal(report.findings[0].policyReason, "scope_missing");
  assert.equal(report.summary.unexpectedAllows, 1);
});

test("fails closed when a configured identity status field is missing", () => {
  const report = auditTrace({
    policy,
    trace: [{ tool: "invoice.send", args: {}, decision: "ALLOW" }]
  });
  assert.equal(report.findings[0].policyReason, "identity_status_missing");
  assert.equal(report.summary.unexpectedAllows, 1);
});

test("allows a non-revoked identity when its status is present", () => {
  const report = auditTrace({
    policy,
    trace: [{ tool: "invoice.send", args: { identityStatus: "active" }, decision: "ALLOW" }]
  });
  assert.equal(report.status, "PASS");
  assert.equal(report.summary.matched, 1);
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

test("rejects empty traces instead of returning a vacuous PASS", () => {
  assert.throws(() => auditTrace({ policy, trace: [] }), /empty trace cannot produce PASS/);
  assert.throws(() => auditTrace({ policy, trace: { events: [] } }), /empty trace cannot produce PASS/);
});

test("rejects duplicate event identifiers", () => {
  assert.throws(() => auditTrace({
    policy,
    trace: [
      { id: "duplicate", tool: "refund.create", args: { amount: 100 }, decision: "ALLOW" },
      { id: "duplicate", tool: "refund.create", args: { amount: 200 }, decision: "ALLOW" }
    ]
  }), /id must be unique/);
});

test("rejects malformed policy rules rather than silently weakening the policy", () => {
  assert.throws(() => auditTrace({
    policy: { version: 1, tools: { "refund.create": { enabled: true, amountField: "amount" } } },
    trace: [{ tool: "refund.create", args: { amount: 100 }, decision: "ALLOW" }]
  }), /requires a non-negative maxWithoutApproval/);

  assert.throws(() => auditTrace({
    policy: { version: 1, tools: { "customer.read": { enabled: true, allowedScopes: "profile" } } },
    trace: [{ tool: "customer.read", args: { scope: "profile" }, decision: "ALLOW" }]
  }), /allowedScopes must be a non-empty array of strings/);
});

test("rejects oversized event collections", () => {
  const trace = Array.from({ length: 10_001 }, (_, index) => ({
    tool: "refund.create",
    args: { amount: 1 },
    decision: "ALLOW"
  }));
  assert.throws(() => auditTrace({ policy, trace }), /more than 10000 events/);
});
