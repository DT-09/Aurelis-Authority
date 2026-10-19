import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { reconcileAgUiApprovalResume } from "../src/ag-ui-approval-adapter.mjs";

const [captureDir, expectedRevision, expectedMultiCount, expectedMissingId = ""] = process.argv.slice(2);
if (!captureDir || !expectedRevision || expectedMultiCount === undefined) {
  console.error("Usage: node scripts/verify-agui-runtime-repro.mjs <capture-dir> <affected|fixed> <expected-multi-execution-count> [expected-missing-call-id]");
  process.exit(2);
}

const expectedCount = Number(expectedMultiCount);
const files = (await readdir(captureDir)).filter(name => name.endsWith(".json") && name !== "summary.json");
const reports = [];
let failed = false;

for (const file of files) {
  const capture = JSON.parse(await readFile(join(captureDir, file), "utf8"));
  const report = reconcileAgUiApprovalResume({
    initialToolCalls: capture.initialToolCalls,
    resolvedInterrupts: capture.resolvedInterrupts,
    resumeEvents: capture.resumeEvents
  });
  const executionCount = capture.observedExecutions.length;
  const missingIds = report.findings
    .filter(item => item.finding === "APPROVED_CALL_NOT_EXECUTED")
    .map(item => item.id);
  const record = {
    revision: expectedRevision,
    sourceCommit: capture.sourceCommit,
    caseId: capture.caseId,
    initialInterruptIds: capture.initialInterruptIds,
    frameworkObservedExecutions: executionCount,
    resumeEventTypes: capture.resumeEventTypes,
    aurelisStatus: report.status,
    aurelisFindings: report.findings.map(item => ({ finding: item.finding, id: item.id })),
    missingIds
  };
  reports.push(record);

  if (capture.caseId === "two-accepted") {
    const expectedCallIds = capture.initialToolCalls.map(call => call.id).sort();
    const actualInterruptIds = [...(capture.initialInterruptIds || [])].sort();
    if (JSON.stringify(actualInterruptIds) !== JSON.stringify(expectedCallIds)) {
      console.error(`Initial runtime turn did not surface the expected two interrupts: ${JSON.stringify(actualInterruptIds)}`);
      failed = true;
    }
    if (executionCount !== expectedCount) {
      console.error(`Expected ${expectedCount} actual executions on ${expectedRevision}, observed ${executionCount}`);
      failed = true;
    }
    if (capture.toolResultEvents.length !== expectedCount) {
      console.error(`Expected ${expectedCount} result events on ${expectedRevision}, observed ${capture.toolResultEvents.length}`);
      failed = true;
    }
    if (expectedMissingId) {
      if (!missingIds.includes(expectedMissingId)) {
        console.error(`Expected Aurelis to flag missing call ${expectedMissingId} on ${expectedRevision}`);
        failed = true;
      }
    } else if (missingIds.length !== 0) {
      console.error(`Unexpected missing-execution finding on ${expectedRevision}: ${missingIds.join(", ")}`);
      failed = true;
    }
  }

  if (capture.caseId === "accepted-and-rejected") {
    const rejectedId = capture.resolvedInterrupts.find(item => item.payload.accepted === false)?.interruptId;
    if (executionCount !== 1) {
      console.error(`Mixed accept/reject false-positive control expected exactly one side effect; observed ${executionCount}`);
      failed = true;
    }
    if (rejectedId && missingIds.includes(rejectedId)) {
      console.error(`False positive: rejected call ${rejectedId} was reported as missing execution`);
      failed = true;
    }
  }

  if (capture.caseId === "single-accepted") {
    if (executionCount !== 1 || missingIds.length !== 0) {
      console.error("Single-approved-call control failed");
      failed = true;
    }
  }
}

console.log(JSON.stringify({ revision: expectedRevision, reports, passed: !failed }, null, 2));
if (failed) process.exitCode = 1;
