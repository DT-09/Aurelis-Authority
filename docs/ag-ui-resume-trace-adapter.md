# AG-UI approval/resume trace adapter

## Purpose

This adapter maps an observed AG-UI trace into Aurelis's approval-to-execution reconciliation input. It is based on the event shape described in [Microsoft Agent Framework issue #7569](https://github.com/microsoft/agent-framework/issues/7569): two accepted approval interrupts, followed by a resume stream with one tool result and no event for the other approved call.

## Run the local regression fixture

```sh
npm test
npm run experiment:approval-reconciliation
```

The adapter tests use event-shaped fixtures; they do not install or launch Microsoft Agent Framework. The tests verify mapping behavior and the detector's result, not a live upstream reproduction.

## Adapter contract

Pass three artifacts from the same conversation/run:
- `initialToolCalls`: original assistant function calls, each with `id` and `name` (or equivalent `callId`/`tool` or `toolCallId`/`toolCallName` fields).
- `resolvedInterrupts`: resolved interrupt records with `interruptId`, `status: "resolved"`, and `payload.accepted: true|false`.
- `resumeEvents`: AG-UI event records. `ToolCallStartEvent` / `TOOL_CALL_START` and `ToolCallResultEvent` / `TOOL_CALL_RESULT` count as observed execution events. Terminal events such as `RunFinishedEvent` do not.

Example:

```js
import { reconcileAgUiApprovalResume } from "./src/ag-ui-approval-adapter.mjs";

const report = reconcileAgUiApprovalResume({
  initialToolCalls: [{ id: "c1", name: "deploy_change" }, { id: "c2", name: "deploy_other" }],
  resolvedInterrupts: [
    { interruptId: "c1", status: "resolved", payload: { accepted: true } },
    { interruptId: "c2", status: "resolved", payload: { accepted: true } }
  ],
  resumeEvents: [
    { type: "ToolCallResultEvent", toolCallId: "c1", toolCallName: "deploy_change" }
  ]
});
console.log(report.findings);
```

Expected finding: `APPROVED_CALL_NOT_EXECUTED` for `c2`.

## Interpretation limits

- A tool-call start without a result is evidence of an observed attempt, not successful completion.
- Missing events can mean dropped execution, incomplete telemetry, or an adapter/ID mapping problem.
- Event names and fields vary by framework/version. Preserve raw source events and test the adapter against captured traces before using it operationally.
- This is post-run reconciliation. It does not prevent a call from being dropped, provide exactly-once semantics, or prove financial loss or willingness to pay.
- No network calls or tool executions occur in these tests.
