# Approval-to-execution reconciliation experiment

## Why this exists

Microsoft Agent Framework issue [#7569](https://github.com/microsoft/agent-framework/issues/7569) reports a multi-approval resume where two tool calls are accepted but only one executes. This experiment tests a narrow detection idea: compare the set of accepted approval IDs with the execution records and flag missing, duplicate, unapproved, or mismatched calls.

This does **not** fix the upstream framework defect. It tests whether Aurelis can detect the discrepancy from exported records.

## Run

Requires Node.js 20+; no third-party packages.

```sh
npm test
```

The unit tests use synthetic records only and have no network calls or external side effects.

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

## What would count as evidence

- A valid baseline trace that contains both accepted approvals but only one execution.
- The existing decision-only audit should not be represented as catching this by itself; it evaluates recorded ALLOW/DENY events, not missing call IDs.
- Reconciliation should flag the missing ID while passing a complete one-to-one trace.
- A real adapter must preserve stable call IDs across approval and execution events. If the framework omits or rewrites IDs, that is an integration limitation, not proof of a dropped action.
- Before claiming product advantage, test against the actual affected framework version and its event export, and measure false positives on normal traces.

## Limitations

This is a synthetic detection test, not an end-to-end reproduction of issue #7569 and not proof that a production incident or financial loss occurred. Missing records can reflect telemetry loss or schema mismatch as well as missing execution. It does not prevent duplicate side effects or provide exactly-once semantics.
