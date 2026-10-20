import { reconcileApprovedExecutions } from "./approval-execution-reconciliation.mjs";

const ACCEPTED_EVENT_TYPES = new Set(["TOOL_CALL_START", "TOOL_CALL_RESULT"]);
function eventType(event) {
  return String(event?.type ?? event?.event ?? "").replace(/Event$/, "").replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
}

/**
 * Adapt a real AG-UI approval/resume trace into Aurelis's reconciliation schema.
 *
 * Inputs are kept explicit because the initial tool-call message, resolved
 * interrupts, and resume stream may be separate artifacts. This function does
 * not infer an approval from a tool call or an execution from RUN_FINISHED.
 */
export function reconcileAgUiApprovalResume({ initialToolCalls, resolvedInterrupts, resumeEvents }) {
  for (const [name, value] of Object.entries({ initialToolCalls, resolvedInterrupts, resumeEvents })) {
    if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  }

  const toolByCallId = new Map();
  for (const call of initialToolCalls) {
    const callId = call?.id ?? call?.callId ?? call?.toolCallId;
    const tool = call?.name ?? call?.tool ?? call?.toolCallName;
    if (typeof callId !== "string" || !callId.trim()) throw new TypeError("initial tool call requires id/callId/toolCallId");
    if (typeof tool !== "string" || !tool.trim()) throw new TypeError(`initial tool call ${callId} requires name/tool/toolCallName`);
    if (toolByCallId.has(callId)) throw new TypeError(`duplicate initial tool call id: ${callId}`);
    toolByCallId.set(callId, tool);
  }

  const approvals = [];
  for (const interrupt of resolvedInterrupts) {
    const callId = interrupt?.interruptId ?? interrupt?.id;
    if (typeof callId !== "string" || !callId.trim()) throw new TypeError("resolved interrupt requires interruptId/id");
    const accepted = interrupt?.payload?.accepted === true;
    const status = interrupt?.status;
    // Only explicit accepted resolutions count as accepted approvals.
    if (status === "resolved" && accepted) {
      const tool = toolByCallId.get(callId);
      if (!tool) {
        // Preserve an identifiable approval with an explicit sentinel so the
        // core validator fails closed rather than silently dropping it.
        approvals.push({ callId, tool: "__UNKNOWN_TOOL__", status: "accepted" });
      } else {
        approvals.push({ callId, tool, status: "accepted" });
      }
    } else {
      approvals.push({
        callId,
        tool: toolByCallId.get(callId) ?? "__UNKNOWN_TOOL__",
        status: status === "resolved" && interrupt?.payload?.accepted === false ? "rejected" : "unresolved"
      });
    }
  }

  const executionByCallId = new Map();
  for (const event of resumeEvents) {
    if (!ACCEPTED_EVENT_TYPES.has(eventType(event))) continue;
    const callId = event?.toolCallId ?? event?.callId;
    if (typeof callId !== "string" || !callId.trim()) continue;
    const tool = event?.toolCallName ?? event?.name ?? toolByCallId.get(callId);
    if (typeof tool !== "string" || !tool.trim()) continue;
    const records = executionByCallId.get(callId) ?? [];
    records.push({ callId, tool, eventType: eventType(event) });
    executionByCallId.set(callId, records);
  }

  // A call start and its result are two lifecycle events, not two executions.
  // Collapse them to one execution record per call ID while preserving repeated
  // starts/results of the same kind as duplicate-execution evidence.
  const executions = [];
  for (const [callId, records] of executionByCallId) {
    const starts = records.filter(record => record.eventType === "TOOL_CALL_START").length;
    const results = records.filter(record => record.eventType === "TOOL_CALL_RESULT").length;
    const count = Math.max(starts, results, 1);
    for (let index = 0; index < count; index += 1) {
      executions.push({ callId, tool: records[0].tool, outcome: results > index ? "result_observed" : "start_observed" });
    }
  }

  const report = reconcileApprovedExecutions({ approvals, executions });
  return {
    ...report,
    scope: {
      ...report.scope,
      mode: "AG_UI_APPROVAL_RESUME_TRACE",
      toolsExecuted: false,
      externalSystemsContacted: false
    },
    inputSummary: {
      initialToolCalls: initialToolCalls.length,
      resolvedInterrupts: resolvedInterrupts.length,
      resumeEvents: resumeEvents.length,
      recognizedExecutionEvents: resumeEvents.filter(event => ACCEPTED_EVENT_TYPES.has(eventType(event))).length
    },
    limitations: [
      ...report.limitations,
      "This adapter maps caller-supplied AG-UI events; it does not launch Microsoft Agent Framework or prove event-stream completeness.",
      "A TOOL_CALL_START without a result is counted as an observed execution attempt, not proof of successful completion.",
      "Provide the initial tool-call records, resolved interrupts, and full resume stream from the same run; missing or transformed IDs can create false positives."
    ]
  };
}
