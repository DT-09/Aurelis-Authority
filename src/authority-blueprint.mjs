const IDENTIFIER = /^[A-Za-z0-9_.-]{1,64}$/;
const FIELD = /^[A-Za-z][A-Za-z0-9_.-]{0,47}$/;

function requiredIdentifier(value, label, pattern = IDENTIFIER) {
  if (typeof value !== "string" || !pattern.test(value.trim())) {
    throw new TypeError(`${label} must be a valid identifier`);
  }
  return value.trim();
}

function list(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
  const clean = [...new Set(value.map(item => String(item).trim()).filter(Boolean))];
  return clean;
}

export function createBlueprint(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Blueprint input must be an object");
  }

  const tool = requiredIdentifier(input.tool, "Tool");
  const amountField = requiredIdentifier(input.amountField, "Amount field", FIELD);
  const scopeField = requiredIdentifier(input.scopeField, "Scope field", FIELD);
  const identityField = requiredIdentifier(input.identityField, "Identity field", FIELD);
  const approvalField = requiredIdentifier(input.approvalField || "approvalToken", "Approval field", FIELD);
  const disabledTool = input.disabledTool ? requiredIdentifier(input.disabledTool, "Disabled tool") : "";

  if (new Set([amountField, scopeField, identityField, approvalField]).size !== 4) {
    throw new TypeError("Amount, scope, identity and approval fields must be distinct");
  }

  const threshold = Number(input.threshold);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100000000) {
    throw new TypeError("Threshold must be a number between 0 and 100,000,000");
  }

  const allowedScopes = list(input.allowedScopes || [], "Allowed scopes");
  const deniedScopes = list(input.deniedScopes || [], "Denied scopes");
  if (!allowedScopes.length && !deniedScopes.length) {
    throw new TypeError("At least one allowed or denied scope is required");
  }

  const deniedIdentityStatuses = list(input.deniedIdentityStatuses || [], "Denied identity statuses");
  const rule = {
    enabled: true,
    amountField,
    maxWithoutApproval: threshold,
    approvalField,
    scopeField
  };
  if (allowedScopes.length) rule.allowedScopes = allowedScopes;
  if (deniedScopes.length) rule.deniedScopes = deniedScopes;
  if (deniedIdentityStatuses.length) {
    rule.identityStatusField = identityField;
    rule.deniedIdentityStatuses = deniedIdentityStatuses;
  }

  const tools = { [tool]: rule };
  if (disabledTool && disabledTool !== tool) tools[disabledTool] = { enabled: false };
  const policy = { version: 1, tools };

  const baseAmount = Math.floor(threshold / 2);
  const baseArgs = {
    [amountField]: baseAmount,
    [scopeField]: allowedScopes[0] || "orders",
    [identityField]: "active"
  };
  const tests = [
    {
      id: "case-01",
      name: "Permitted action within threshold",
      tool,
      args: { ...baseArgs },
      expected: "ALLOW",
      reason: "Enabled tool, permitted scope, active identity, amount within threshold"
    },
    {
      id: "case-02",
      name: "Amount above threshold without approval",
      tool,
      args: { ...baseArgs, [amountField]: threshold + 1 },
      expected: "DENY",
      reason: "Approval is required above the configured threshold"
    },
    {
      id: "case-03",
      name: "Amount above threshold with approval value",
      tool,
      args: { ...baseArgs, [amountField]: threshold + 1, [approvalField]: "SIMULATED-APPROVAL" },
      expected: "ALLOW",
      reason: "A non-empty approval value is present; authenticity is not checked"
    }
  ];

  if (allowedScopes.length && deniedScopes.length) {
    tests.push({
      id: "case-04",
      name: "Explicitly denied scope",
      tool,
      args: { ...baseArgs, [scopeField]: deniedScopes[0] },
      expected: "DENY",
      reason: "Scope is outside the allowed set or explicitly denied"
    });
  }

  if (deniedIdentityStatuses.length) {
    tests.push({
      id: "case-05",
      name: "Revoked or suspended identity",
      tool,
      args: { ...baseArgs, [identityField]: deniedIdentityStatuses[0] },
      expected: "DENY",
      reason: "Identity status is configured as denied"
    });
  }

  if (disabledTool && disabledTool !== tool) {
    tests.push({
      id: "case-06",
      name: "Attempt to invoke disabled tool",
      tool: disabledTool,
      args: {},
      expected: "DENY",
      reason: "Tool is not enabled in the policy"
    });
  }

  return {
    policy,
    tests,
    notes: {
      agent: String(input.agent || "").trim(),
      workflow: String(input.workflow || "").trim(),
      currency: String(input.currency || "USD").trim(),
      limitations: [
        "Draft policy generated from user inputs; requires policy-owner review.",
        "Approval validation checks only for a non-empty value; it does not authenticate the approver.",
        "The challenge plan defines expected outcomes only. Actual observations must come from an authorized staging run.",
        "A trace audit cannot establish trace completeness or runtime enforcement."
      ]
    }
  };
}
