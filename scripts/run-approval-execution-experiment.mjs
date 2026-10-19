import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { auditTrace } from "../src/authority-trace-audit.mjs";
import { reconcileApprovedExecutions } from "../src/approval-execution-reconciliation.mjs";

const inputPath = resolve(process.argv[2] || "tests/fixtures/approval-execution-gap.json");
const input = JSON.parse(await readFile(inputPath, "utf8"));
const decisionAudit = auditTrace({ policy: input.policy, trace: input.decisionTrace });
const reconciliation = reconcileApprovedExecutions({
  approvals: input.approvals,
  executions: input.executions
});

const expectedFinding = reconciliation.findings.find(
  finding => finding.finding === input.expectedFinding && finding.id === input.expectedMissingCallId
);
const result = {
  experiment: "approval-execution-reconciliation",
  caseId: input.caseId,
  sourceReference: input.sourceReference,
  caseType: input.caseType,
  baseline: {
    name: "existing decision-only trace audit",
    status: decisionAudit.status,
    findings: decisionAudit.summary.findings,
    interpretation: "The supplied decision events match policy; this audit cannot infer a missing call that has no event."
  },
  reconciliation: {
    status: reconciliation.status,
    findings: reconciliation.summary.findings,
    criticalFindings: reconciliation.summary.criticalFindings,
    acceptedApprovalsMissingExecution: reconciliation.summary.acceptedApprovalsMissingExecution,
    expectedMissingCallDetected: Boolean(expectedFinding)
  },
  result: decisionAudit.status === "PASS" && Boolean(expectedFinding)
    ? "DETECTION_DIFFERENCE_DEMONSTRATED_ON_SYNTHETIC_FIXTURE"
    : "EXPERIMENT_FAILED",
  limitations: [
    "The fixture is synthetic and shaped by a public bug report; it is not a run of Microsoft Agent Framework.",
    "The result proves a schema-level capability difference only: approval/execution reconciliation can detect a missing record that a decision-only audit cannot infer.",
    "Missing execution records can also be caused by missing telemetry or ID mapping errors.",
    "No external systems are contacted and no tools or side effects are executed."
  ]
};

console.log(JSON.stringify(result, null, 2));
if (result.result !== "DETECTION_DIFFERENCE_DEMONSTRATED_ON_SYNTHETIC_FIXTURE") {
  process.exitCode = 1;
}
