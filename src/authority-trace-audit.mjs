/**
 * Offline audit of recorded agent tool-call traces against an explicit authority policy.
 * This module does not intercept, block, or execute tools.
 */

const DECISIONS = new Set(["ALLOW", "DENY"]);
const MAX_TRACE_EVENTS = 10_000;

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
}

function assertString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}

function assertStringArray(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some(item => typeof item !== "string" || !item.trim())) {
    throw new TypeError(`${label} must be a non-empty array of strings`);
  }
}

function validatePolicy(policy) {
  assertObject(policy, "policy");
  if (policy.version !== 1 || !policy.tools || typeof policy.tools !== "object" || Array.isArray(policy.tools)) {
    throw new TypeError("policy must use version 1 and contain a tools object");
  }

  const toolNames = Object.keys(policy.tools);
  if (toolNames.length === 0) throw new TypeError("policy.tools must define at least one tool");

  for (const toolName of toolNames) {
    assertString(toolName, "policy tool name");
    const rule = policy.tools[toolName];
    assertObject(rule, `policy rule for ${toolName}`);

    if (typeof rule.enabled !== "boolean") {
      throw new TypeError(`policy rule for ${toolName} requires an enabled boolean`);
    }

    if (rule.amountField !== undefined) {
      assertString(rule.amountField, `policy rule for ${toolName} amountField`);
      if (!Number.isFinite(rule.maxWithoutApproval) || rule.maxWithoutApproval < 0) {
        throw new TypeError(`policy rule for ${toolName} requires a non-negative maxWithoutApproval`);
      }
      if (rule.approvalField !== undefined) {
        assertString(rule.approvalField, `policy rule for ${toolName} approvalField`);
      }
    } else if (rule.maxWithoutApproval !== undefined || rule.approvalField !== undefined) {
      throw new TypeError(`policy rule for ${toolName} cannot define approval thresholds without amountField`);
    }

    if (rule.allowedScopes !== undefined) assertStringArray(rule.allowedScopes, `policy rule for ${toolName} allowedScopes`);
    if (rule.deniedScopes !== undefined) assertStringArray(rule.deniedScopes, `policy rule for ${toolName} deniedScopes`);
    if ((rule.allowedScopes !== undefined || rule.deniedScopes !== undefined) && rule.scopeField !== undefined) {
      assertString(rule.scopeField, `policy rule for ${toolName} scopeField`);
    }

    if (rule.identityStatusField !== undefined || rule.deniedIdentityStatuses !== undefined) {
      assertString(rule.identityStatusField, `policy rule for ${toolName} identityStatusField`);
      assertStringArray(rule.deniedIdentityStatuses, `policy rule for ${toolName} deniedIdentityStatuses`);
    }
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
    if (amount > rule.maxWithoutApproval) {
      const approval = rule.approvalField ? args[rule.approvalField] : null;
      if (!(typeof approval === "string" && approval.trim().length > 0)) {
        return { decision: "DENY", reason: "approval_required" };
      }
    }
  }

  if (rule.allowedScopes || rule.deniedScopes) {
    const scope = args[rule.scopeField || "scope"];
    if (typeof scope !== "string" || !scope.trim()) {
      return { decision: "DENY", reason: "scope_missing" };
    }
    if (rule.allowedScopes && !rule.allowedScopes.includes(scope)) {
      return { decision: "DENY", reason: "scope_not_allowed" };
    }
    if (rule.deniedScopes && rule.deniedScopes.includes(scope)) {
      return { decision: "DENY", reason: "scope_explicitly_denied" };
    }
  }

  if (rule.identityStatusField && rule.deniedIdentityStatuses) {
    const status = args[rule.identityStatusField];
    if (typeof status !== "string" || !status.trim()) {
      return { decision: "DENY", reason: "identity_status_missing" };
    }
    if (rule.deniedIdentityStatuses.includes(status)) {
      return { decision: "DENY", reason: "identity_status_denied" };
    }
  }

  return { decision: "ALLOW", reason: "policy_conditions_satisfied" };
}

export function auditTrace({ policy, trace }) {
  validatePolicy(policy);

  const events = Array.isArray(trace) ? trace : trace?.events;
  if (!Array.isArray(events) || events.length === 0) {
    throw new TypeError("trace must contain at least one event; an empty trace cannot produce PASS");
  }
  if (events.length > MAX_TRACE_EVENTS) {
    throw new TypeError(`trace cannot contain more than ${MAX_TRACE_EVENTS} events`);
  }

  const seenIds = new Set();
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
    if (event.id !== undefined) {
      assertString(event.id, `trace event at index ${index} id`);
      if (seenIds.has(event.id)) {
        throw new TypeError(`trace event id must be unique: ${event.id}`);
      }
      seenIds.add(event.id);
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
    schemaVersion: "1.1",
    status: unexpectedAllows > 0 ? "FAIL" : unexpectedDenies > 0 ? "REVIEW" : "PASS",
    scope: {
      mode: "OFFLINE_TRACE_AUDIT",
      toolsExecuted: false,
      externalSystemsContacted: false,
      enforcementApplied: false,
      traceEventsAudited: results.length,
      maxTraceEvents: MAX_TRACE_EVENTS
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
      "A PASS means only that the supplied non-empty events match the supplied policy; it is not a security certification or proof of complete coverage.",
      "Approval checks verify only that a non-empty approval value is present; they do not authenticate the approver or validate the approval against an external authority."
    ]
  };
}
