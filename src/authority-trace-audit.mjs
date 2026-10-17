/**
 * Offline audit of recorded agent tool-call traces against an explicit authority policy.
 * This module does not intercept, block, or execute tools. It audits observations only.
 */

const DECISIONS = new Set(["ALLOW", "DENY"]);

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
}

function expectedDecision(event, policy) {
  const rule = policy.tools[event.tool];
  if (!rule || rule.enabled !== true) {
    return { decision: "DENY", reason: "tool_not_enabled" };
  }

  const args = event.args;

  if (rule.amountField) {
    const amount = args[rule.amountField];
    if (!Number.isFinite(amount) || amount < 0) {
      return { decision: "DENY", reason: "invalid_or_missing_amount" };
    }
    if (Number.isFinite(rule.maxWithoutApproval) && amount > rule.maxWithoutApproval) {
      const approval = rule.approvalField ? args[rule.approvalField] : null;
      if (!(typeof approval === "string" && approval.trim().length > 0)) {
        return { decision: "DENY", reason: "approval_required" };
      }
    }
  }

  if (rule.allowedScopes) {
    const scope = args[rule.scopeField || "scope"];
    if (!rule.allowedScopes.includes(scope)) {
      return { decision: "DENY", reason: "scope_not_allowed" };
    }
  }

  if (rule.deniedScopes) {
    const scope = args[rule.scopeField || "scope"];
    if (rule.deniedScopes.includes(scope)) {
      return { decision: "DENY", reason: "scope_explicitly_denied" };
    }
  }

  if (rule.identityStatusField && rule.deniedIdentityStatuses) {
    const status = args[rule.identityStatusField];
    if (rule.deniedIdentityStatuses.includes(status)) {
      return { decision: "DENY", reason: "identity_status_denied" };
    }
  }

  return { decision: "ALLOW", reason: "policy_conditions_satisfied" };
}

export function auditTrace({ policy, trace }) {
  assertObject(policy, "policy");
  if (policy.version !== 1 || !policy.tools || typeof policy.tools !== "object" || Array.isArray(policy.tools)) {
    throw new TypeError("policy must use version 1 and contain a tools object");
  }

  const events = Array.isArray(trace) ? trace : trace?.events;
  if (!Array.isArray(events)) throw new TypeError("trace must be an array or an object with an events array");

  const findings = [];
  const results = events.map((event, index) => {
    assertObject(event, `trace event at index ${index}`);
    if (typeof event.tool !== "string" || !event.tool.trim()) {
      throw new TypeError(`trace event at index ${index} requires a tool string`);
    }
    if (!event.args || typeof event.args !== "object" || Array.isArray(event.args)) {
      throw new TypeError(`trace event at index ${index} requires an args object`);
    }
    if (!DECISIONS.has(event.decision)) {
      throw new TypeError(`trace event at index ${index} decision must be ALLOW or DENY`);
    }

    const expected = expectedDecision(event, policy);
    const matches = expected.decision === event.decision;
    const result = {
      id: event.id ?? `event-${index + 1}`,
      tool: event.tool,
      expected: expected.decision,
      observed: event.decision,
      matches,
      policyReason: expected.reason
    };

    if (!matches) {
      findings.push({
        ...result,
        severity: expected.decision === "DENY" && event.decision === "ALLOW" ? "CRITICAL" : "WARNING",
        finding: expected.decision === "DENY" && event.decision === "ALLOW"
          ? "UNEXPECTED_ALLOW"
          : "UNEXPECTED_DENY"
      });
    }
    return result;
  });

  const unexpectedAllows = findings.filter(f => f.finding === "UNEXPECTED_ALLOW").length;
  const unexpectedDenies = findings.filter(f => f.finding === "UNEXPECTED_DENY").length;

  return {
    schemaVersion: "1.0",
    status: unexpectedAllows > 0 ? "FAIL" : unexpectedDenies > 0 ? "REVIEW" : "PASS",
    scope: {
      mode: "OFFLINE_TRACE_AUDIT",
      toolsExecuted: false,
      externalSystemsContacted: false,
      enforcementApplied: false
    },
    summary: {
      events: results.length,
      matched: results.length - findings.length,
      unexpectedAllows,
      unexpectedDenies,
      findings: findings.length
    },
    results,
    findings,
    limitations: [
      "This audits recorded decisions; it does not intercept or prevent tool calls.",
      "Input traces must be exported or mapped by the user into the documented schema.",
      "A PASS means only that the supplied events match the supplied policy; it is not a security certification or proof of complete coverage."
    ]
  };
}
