/**
 * Reconcile approved tool calls against recorded execution results.
 * This detects missing, duplicate, and unexpected executions in supplied traces.
 * It does not intercept tools or prevent side effects.
 */
function assertArray(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
}
function assertCall(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  if (typeof value.callId !== "string" || !value.callId.trim()) {
    throw new TypeError(`${label} requires a non-empty callId`);
  }
  if (typeof value.tool !== "string" || !value.tool.trim()) {
    throw new TypeError(`${label} requires a non-empty tool`);
  }
}

export function reconcileApprovedExecutions({ approvals, executions }) {
  assertArray(approvals, "approvals");
  assertArray(executions, "executions");
  approvals.forEach((item, i) => assertCall(item, `approval at index ${i}`));
  executions.forEach((item, i) => assertCall(item, `execution at index ${i}`));

  const approvalById = new Map();
  const executionById = new Map();
  const findings = [];

  for (const approval of approvals) {
    if (approvalById.has(approval.callId)) {
      findings.push({
        id: approval.callId, severity: "CRITICAL",
        finding: "DUPLICATE_APPROVAL_ID",
        message: "More than one approval record uses the same callId."
      });
    } else {
      approvalById.set(approval.callId, approval);
    }
    if (approval.status !== "accepted") {
      findings.push({
        id: approval.callId, severity: "WARNING",
        finding: "APPROVAL_NOT_ACCEPTED",
        message: "Approval record is not marked accepted; execution is not expected."
      });
    }
  }

  for (const execution of executions) {
    const group = executionById.get(execution.callId) || [];
    group.push(execution);
    executionById.set(execution.callId, group);
  }

  for (const [callId, group] of executionById) {
    if (group.length > 1) {
      findings.push({
        id: callId, severity: "CRITICAL",
        finding: "DUPLICATE_EXECUTION",
        count: group.length,
        message: "The same callId has multiple execution records; inspect for repeated side effects."
      });
    }
    const approval = approvalById.get(callId);
    if (!approval) {
      findings.push({
        id: callId, severity: "CRITICAL",
        finding: "EXECUTION_WITHOUT_APPROVAL",
        message: "An execution record has no matching approval record."
      });
      continue;
    }
    if (approval.tool !== group[0].tool) {
      findings.push({
        id: callId, severity: "CRITICAL",
        finding: "APPROVED_TOOL_MISMATCH",
        expectedTool: approval.tool,
        observedTool: group[0].tool,
        message: "The executed tool differs from the approved tool."
      });
    }
  }

  for (const approval of approvals) {
    if (approval.status !== "accepted") continue;
    const executionsForCall = executionById.get(approval.callId) || [];
    if (executionsForCall.length === 0) {
      findings.push({
        id: approval.callId, severity: "CRITICAL",
        finding: "APPROVED_CALL_NOT_EXECUTED",
        tool: approval.tool,
        message: "A call marked accepted has no matching execution record."
      });
    }
  }

  const critical = findings.filter(f => f.severity === "CRITICAL").length;
  return {
    schemaVersion: "1.0",
    status: critical > 0 ? "FAIL" : findings.length > 0 ? "REVIEW" : "PASS",
    scope: {
      mode: "OFFLINE_APPROVAL_EXECUTION_RECONCILIATION",
      toolsExecuted: false,
      externalSystemsContacted: false,
      enforcementApplied: false
    },
    summary: {
      approvals: approvals.length,
      executionRecords: executions.length,
      findings: findings.length,
      criticalFindings: critical,
      acceptedApprovalsMissingExecution: findings.filter(f => f.finding === "APPROVED_CALL_NOT_EXECUTED").length,
      duplicateExecutions: findings.filter(f => f.finding === "DUPLICATE_EXECUTION").length
    },
    findings,
    limitations: [
      "This compares supplied approval and execution records; it cannot prove the records are complete or authentic.",
      "A missing execution record may indicate dropped work, missing telemetry, or an adapter/schema mismatch; investigate before attributing cause.",
      "This is post-run detection, not runtime prevention, exactly-once execution, or a security certification."
    ]
  };
}
