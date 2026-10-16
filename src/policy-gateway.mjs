// Enforcement boundary for the local demonstration. Mock tools never call external services.
const allowedTools = new Set([
  "refund.create",
  "customer_record.read",
  "purchase.submit",
  "invoice.send"
]);

function validArguments(action, args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) return false;
  switch (action) {
    case "refund.create":
      return Number.isFinite(args.amount) && args.amount >= 0 &&
        (args.approvalToken === null || typeof args.approvalToken === "string");
    case "customer_record.read":
      return typeof args.scope === "string" && typeof args.taskAuthorization === "boolean";
    case "purchase.submit":
      return Number.isFinite(args.amount) && args.amount >= 0 &&
        (args.approval === null || typeof args.approval === "string");
    case "invoice.send":
      return ["active", "revoked"].includes(args.identityStatus);
    default:
      return false;
  }
}

function boundaryAllows(action, args) {
  switch (action) {
    case "refund.create":
      return args.amount <= 500 || Boolean(args.approvalToken);
    case "customer_record.read":
      return args.scope !== "restricted" || args.taskAuthorization === true;
    case "purchase.submit":
      return args.amount <= 1000 || Boolean(args.approval);
    case "invoice.send":
      return args.identityStatus === "active";
    default:
      return false;
  }
}

export function invokeMockTool({ action, args }, { enforcePolicy = false } = {}) {
  const checks = {
    knownTool: allowedTools.has(action),
    validArguments: validArguments(action, args),
    policyAllows: validArguments(action, args) && boundaryAllows(action, args)
  };
  const deniedReason = !checks.knownTool ? "tool_not_allowlisted"
    : !checks.validArguments ? "invalid_arguments"
    : !checks.policyAllows ? "policy_boundary_violation"
    : null;

  // Vulnerable baseline intentionally ignores gateway checks to simulate a missing control.
  // Enforced mode is default-deny: the mock tool receives no accepted call when any check fails.
  if (enforcePolicy && deniedReason) {
    return {
      accepted: false,
      decision: "DENY",
      boundaryEnforced: true,
      reason: deniedReason,
      checks,
      externalSideEffects: false
    };
  }

  return {
    accepted: true,
    decision: "ALLOW",
    boundaryEnforced: false,
    reason: enforcePolicy ? null : "enforcement_disabled_in_vulnerable_baseline",
    checks,
    externalSideEffects: false
  };
}
