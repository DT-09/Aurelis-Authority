import test from "node:test";
import assert from "node:assert/strict";
import { reconcileAgUiApprovalResume } from "../src/ag-ui-approval-adapter.mjs";

const initialToolCalls = [
  { id: "c1", name: "deploy_change" },
  { id: "c2", name: "deploy_other" }
];
const resolvedInterrupts = [
  { interruptId: "c1", status: "resolved", payload: { accepted: true } },
  { interruptId: "c2", status: "resolved", payload: { accepted: true } }
];

test("flags the exact reported shape: two accepted interrupts but one call result", () => {
  const report = reconcileAgUiApprovalResume({
    initialToolCalls,
    resolvedInterrupts,
    resumeEvents: [
      { type: "RunStartedEvent" },
      { type: "ToolCallResultEvent", toolCallId: "c1", toolCallName: "deploy_change", content: "deployed a" },
      { type: "RunFinishedEvent" }
    ]
  });
  assert.equal(report.status, "FAIL");
  assert.ok(report.findings.some(f => f.finding === "APPROVED_CALL_NOT_EXECUTED" && f.id === "c2"));
  assert.equal(report.summary.acceptedApprovalsMissingExecution, 1);
});

test("does not mistake start plus result for duplicate execution", () => {
  const report = reconcileAgUiApprovalResume({
    initialToolCalls: [{ id: "c1", name: "deploy_change" }],
    resolvedInterrupts: [{ interruptId: "c1", status: "resolved", payload: { accepted: true } }],
    resumeEvents: [
      { type: "TOOL_CALL_START", toolCallId: "c1", toolCallName: "deploy_change" },
      { type: "TOOL_CALL_RESULT", toolCallId: "c1", toolCallName: "deploy_change", content: "ok" }
    ]
  });
  assert.equal(report.status, "PASS");
  assert.equal(report.summary.duplicateExecutions, 0);
});

test("flags a started call without a result as observed, not missing", () => {
  const report = reconcileAgUiApprovalResume({
    initialToolCalls: [{ id: "c1", name: "deploy_change" }],
    resolvedInterrupts: [{ interruptId: "c1", status: "resolved", payload: { accepted: true } }],
    resumeEvents: [{ type: "TOOL_CALL_START", toolCallId: "c1", toolCallName: "deploy_change" }]
  });
  assert.equal(report.status, "PASS");
});

test("rejects duplicate IDs in the initial assistant tool-call batch", () => {
  assert.throws(() => reconcileAgUiApprovalResume({
    initialToolCalls: [{ id: "c1", name: "one" }, { id: "c1", name: "two" }],
    resolvedInterrupts: [],
    resumeEvents: []
  }), /duplicate initial tool call id/);
});

test("does not infer execution from unrelated or terminal events", () => {
  const report = reconcileAgUiApprovalResume({
    initialToolCalls,
    resolvedInterrupts,
    resumeEvents: [{ type: "RUN_FINISHED" }, { type: "MESSAGES_SNAPSHOT", messages: [] }]
  });
  assert.equal(report.summary.executionRecords, 0);
  assert.equal(report.summary.acceptedApprovalsMissingExecution, 2);
});
