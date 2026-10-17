# Authority Trace Check

A small, dependency-free Node.js tool for checking recorded AI-agent tool-call decisions against an explicit authority policy.

**Problem addressed:** agent evaluation suites can check whether a response looks correct, while missing whether the agent's recorded tool action crossed a permission boundary. This tool isolates that narrower question: for each recorded tool call, should the configured policy have allowed or denied it, and did the observed decision match?

This is an offline trace auditor, not an agent framework, runtime enforcement gateway, or security certification.

## Run the example

Requires Node.js 20+; no third-party packages.

From the repository root:

```sh
node tools/authority-trace-check/cli.mjs --policy tools/authority-trace-check/examples/policy.json --trace tools/authority-trace-check/examples/trace.json
```

The example intentionally contains three unexpected allows. The command prints the findings and exits with status `1` when at least one policy violation was observed. Use `--format json` for machine-readable output.

Run the test suite:

```sh
npm test
```

## Input contract

Export a trace from your staging/test environment and map each tool-call event to this minimal shape:

```json
{
  "events": [
    {
      "id": "case-001",
      "tool": "refund.create",
      "args": { "amount": 900 },
      "decision": "ALLOW"
    }
  ]
}
```

- `id`: optional stable case/event identifier.
- `tool`: canonical tool name.
- `args`: the relevant arguments needed to evaluate the policy. Remove secrets and unnecessary personal data.
- `decision`: the observed decision made by the system under test, exactly `ALLOW` or `DENY`.

This tool does not currently integrate directly with LangChain, LangGraph, OpenAI Agents SDK, or other frameworks. You must export or adapt their trace format yourself. Do not paste production secrets or personal data into fixtures.

## Policy contract

See `examples/policy.json`. Policies use version `1` and a `tools` object. An absent or disabled tool is denied by default. Supported constraints:

- `enabled`: tool must explicitly be enabled.
- `amountField`, `maxWithoutApproval`, `approvalField`: deny missing/invalid/negative amounts; require a non-empty approval token above the configured threshold.
- `scopeField`, `allowedScopes`, `deniedScopes`: constrain resource scopes.
- `identityStatusField`, `deniedIdentityStatuses`: deny listed identity states, such as `revoked`.

These are intentionally simple deterministic checks. They do not infer intent from natural language or establish whether the policy itself is correct.

## CI use

Call the CLI after a test run that produces a trace file. Fail the CI step when the process exits with code `1`. Invalid input exits with code `2`. The auditor never executes the recorded tool calls.

## How to interpret results

- `FAIL`: at least one event was observed as ALLOW while the configured policy expected DENY.
- `REVIEW`: no unexpected allows, but at least one event was denied when the policy expected ALLOW.
- `PASS`: all supplied events matched the supplied policy.

A PASS is deliberately narrow: it says only that the events supplied to this run matched the supplied policy. It does not establish complete trace coverage, correct policy design, runtime prevention, or production security.

## Limitations and safe use

- This is post-run audit, not prevention. It does not intercept, block, or modify actions.
- It only checks fields present in the trace; omitted context can produce misleading results.
- Policy constraints are deterministic and limited to the documented schema.
- Use synthetic data and an authorized staging environment for tests.
- Do not treat a result as a certification, guarantee, or substitute for a security review.

## Contributing

Useful contributions include tested trace adapters, additional explicit policy predicates, malformed-input tests, and reproducible regression fixtures. Any new predicate should include tests for both allowed and denied cases.
