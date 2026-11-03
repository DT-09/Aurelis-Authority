# Authority Blueprint Studio — commercial use

## What it is

The public Authority Blueprint Studio turns a user's declared agent workflow into:
- a draft version-1 authority policy compatible with Aurelis's offline trace auditor;
- a challenge plan with expected ALLOW/DENY decisions;
- handoff notes that explain the limits of the generated artifacts.

The studio runs in the browser. It does not upload or retain form inputs, call an LLM, execute tools, inspect a deployment, or prove that an agent follows the generated policy.

## Acquisition path

1. A developer discovers the free studio through documentation, developer communities, search, or an implementation partner.
2. They generate a policy and challenge plan for one consequential workflow.
3. They run the cases in an authorized staging environment and export sanitized tool-call traces.
4. They use the free trace auditor to compare observed decisions with the policy.
5. If they need independent interpretation, remediation guidance, or a retest, they can request a scoped paid assessment.

The free tool must be useful without a sales call. The paid offer must add expert review and evidence interpretation, not merely put a paywall around JSON generation.

## Initial paid offer

Use the existing [first paid pilot scope](first-paid-pilot.md): one agent, one consequential workflow, one customer-approved policy, up to 12 agreed scenarios, up to 1,000 events per audit, one initial audit, one retest, and one technical findings review.

The USD 500 amount in that scope is an unvalidated quote hypothesis. Confirm buyer need, scope, delivery effort, and willingness to pay before quoting. Do not present it as an established market rate.

## First distribution experiments

Prioritize channels where the user is already trying to ship an agent:
- AI implementation agencies and agent-development studios;
- open-source agent framework discussions where a practical tool is welcome;
- engineering newsletters and directories that accept free developer utilities;
- partner conversations with QA, security, and AI delivery consultancies.

Do not spam communities or imply endorsement. Publish a short technical walkthrough showing a generated policy, a deliberately mismatched synthetic trace, and the resulting finding. Every example must be labeled synthetic.

## Commercial qualification

A prospect is qualified only if it:
1. operates or builds an agent that can invoke consequential business tools;
2. has a specific release, client handover, or workflow that needs review;
3. can define an approved authority policy and run authorized staging tests;
4. can provide sanitized trace exports;
5. has a technical owner and a route to a budget decision.

Track tool visits, policy exports, trace-auditor runs, qualified enquiries, proposals, paid pilots, delivery time, and repeat purchases. Page views alone are not evidence of demand.

## Legal and delivery boundary

The user is under 18. Any contract, invoice, tax arrangement, payment account, or customer data-processing agreement must be handled through a parent/guardian or another legally authorized adult and an appropriate business arrangement. Do not accept production credentials or sensitive customer data through the public tool.
