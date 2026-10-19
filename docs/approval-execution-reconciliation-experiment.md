# Approval-to-execution reconciliation experiment

## Why this exists

Microsoft Agent Framework issue [#7569](https://github.com/microsoft/agent-framework/issues/7569) reports a multi-approval resume where two tool calls are accepted but only one executes. Aurelis tests whether it can detect a mismatch by comparing accepted approval IDs against recorded execution IDs.

This does **not** fix or reproduce the upstream framework defect. The checked-in fixture is synthetic and models the reported failure shape.

## Run

Requires Node.js 20+; no third-party packages.

```sh
npm test
npm run experiment:approval-reconciliation
```

The experiment command prints a JSON comparison between Aurelis's existing decision-only audit and the approval/execution reconciliation detector. It exits nonzero if the fixture does not demonstrate the expected difference.

## What the fixture demonstrates

The fixture supplies two accepted approvals but only one execution record.

- The existing decision-only audit returns `PASS` because the one recorded ALLOW event matches the supplied policy. It cannot infer an action that has no event.
- The reconciliation detector returns `FAIL` and reports `APPROVED_CALL_NOT_EXECUTED` for the missing call ID.

This demonstrates a **schema-level detection difference on synthetic data**, not yet a real-world product advantage.

## Input contract

The reconciliation function accepts two arrays:

```json
{
  "approvals": [
    { "callId": "c1", "tool": "deploy_change", "status": "accepted" },
    { "callId": "c2", "tool": "deploy_other", "status": "accepted" }
  ],
  "executions": [
    { "callId": "c1", "tool": "deploy_change", "outcome": "success" }
  ]
}
```

Expected finding: `APPROVED_CALL_NOT_EXECUTED` for `c2`.

## What remains necessary for a real product claim

- Capture a real trace from the affected framework/version that contains approval IDs and execution IDs.
- Map those real events into this schema without inventing missing records.
- Verify the detector flags the actual dropped call.
- Run ordinary, complete approval flows and measure false positives.
- Compare against the framework's own telemetry and available observability tooling.

A real adapter must preserve stable call IDs across approval and execution events. If the framework omits or rewrites IDs, that is an integration limitation, not proof of a dropped action.

## Limitations

Missing execution records can reflect dropped work, incomplete telemetry, or an ID-mapping/schema error. This is post-run detection only: it does not prevent side effects, provide exactly-once semantics, establish production losses, or prove willingness to pay. No external systems are contacted by the fixture or tests.
