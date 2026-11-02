# Aurelis Authority — first paid pilot

**Offer:** Independent AI-agent action-boundary review  
**Buyer:** An AI implementation agency or product team shipping a tool-using agent  
**Initial scope:** One agent, one consequential workflow, one written authority policy

## The buyer's problem

An agent may complete a workflow in a demo while still making an action the business did not authorize: issuing a refund above a limit, accessing a restricted record, invoking an unapproved tool, or acting after access has been revoked.

Ordinary output-quality evaluation does not, by itself, establish whether recorded tool decisions respected the buyer's action policy.

## What Aurelis delivers today

A bounded review of customer-supplied, sanitized staging traces against a customer-approved authority policy:

1. Review the workflow and document the intended action boundaries.
2. Agree a small set of staging test cases with the customer.
3. The customer or its engineering team runs those cases in its own authorized staging environment and exports the resulting tool-call trace.
4. Aurelis maps the trace to the documented input schema and audits expected versus observed ALLOW/DENY decisions.
5. Deliver an evidence report with event identifiers, policy reasons, unexpected allows, unexpected denies, data-quality limitations, and remediation recommendations.
6. Re-audit one supplied retest trace after the customer changes its system.

## Included pilot boundary

- One agent and one workflow.
- One customer-approved version-1 policy.
- Up to 12 agreed test scenarios.
- Up to 1,000 trace events per audit.
- One initial audit and one retest.
- One technical findings review.
- Target delivery: five business days after complete, valid inputs are received.

Anything outside this scope requires a separate written scope.

## Deliverables

- Scope and assumptions record.
- Policy-to-test-case matrix.
- Machine-readable audit output.
- Human-readable findings report.
- Evidence references to supplied event IDs.
- Remediation and retest status.
- Explicit limitations and unresolved questions.

## What this is not

- Not a penetration test or red-team engagement.
- Not a runtime control or enforcement gateway.
- Not a live framework integration.
- Not a security certification, compliance opinion, or guarantee.
- Not proof that the supplied trace is complete or authentic.
- Not verification that an approval token is genuine. The current auditor checks only for a non-empty approval value when the policy requires one.

The customer retains responsibility for the policy's correctness, test execution, trace export, staging access, and production deployment decisions.

## Pilot pricing hypothesis

**Initial fixed-scope test quote: USD 500.**

This is an unvalidated first-pilot hypothesis, not an established market price or published rate. Confirm scope and buyer willingness before committing. Do not discount below the point where delivery time and review effort are covered. Any quote, contract, invoice, tax handling, or payment arrangement must be made through an adult-authorized and legally appropriate business arrangement.

## Acceptance criteria

The pilot is complete when:
- Inputs pass schema validation.
- Every supplied event is evaluated against the agreed policy.
- Unexpected allows and unexpected denies are separately reported.
- Findings link to the supplied event identifiers.
- The report states the limits of the evidence.
- The retest is evaluated using the same agreed policy version, or policy changes are explicitly versioned.

## Customer inputs required

- Workflow description and intended authority limits.
- Approved policy in the documented JSON format.
- Sanitized staging trace export.
- Field mapping for the customer's trace format.
- Confirmation that the customer is authorized to share the supplied data.
- A technical contact for one clarification/review cycle.

Never request production credentials, secrets, payment data, or unnecessary personal data. Use synthetic or appropriately sanitized staging data.

## Commercial expansion

If the pilot is useful, offer a repeatable service for each new agent/workflow release:
- New workflow assessment.
- Regression audit after policy or tool changes.
- Quarterly or release-based evidence review.
- Agency-level bundle for multiple client deployments.

Recurring revenue is a hypothesis until a buyer agrees to repeat it. Do not sell a retainer before the first pilot demonstrates value.

## Internal sales qualification

Do not pursue a prospect unless it:
1. Builds or operates agents that call business tools/APIs.
2. Has a consequential action boundary (refunds, payments, account changes, data access, approvals, or record deletion).
3. Can provide sanitized staging traces and an explicit policy.
4. Has a named technical or delivery owner.
5. Can approve a paid pilot or introduce the budget owner.

The first sales objective is one paid pilot, not a large pipeline or a broad platform sale.
