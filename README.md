# Aurelis Authority

Independent AI Agent Authority Assurance.

## Product boundary
The initial product is a scoped assessment of one AI agent and one consequential workflow: define intended authority, challenge behavior, record evidence, recommend remediation, and retest.

## Public/private model
The public site contains illustrative demonstrations only. Paid client work should be served from an assessment-scoped private route backed by server-side authorization. No generic login portal is included in this public build.

## Build
`npm test`
`npm run build`

## Deployment
The project is designed to be deployed as a Cloudflare Pages project named `aurelis-authority`. Configure the Pages project separately; do not reuse the old Aurelis ACI/AAI project or database.

## Contact placeholders
Before production deployment, replace the placeholder WhatsApp URL and Gmail/Proton destinations with the actual Aurelis contact destinations. The GitHub destination currently points to `DT-09`.

## Honesty boundary
All assessment values shown on the public site are explicitly illustrative. No customer, certification, regulatory, security, or performance claims are made.

## Commercial positioning
The initial buyer is a team shipping an AI agent that can take consequential actions through tools or APIs. The initial offer is a scoped assessment of one agent and one workflow: define the authority boundary, run authorized challenges, document expected versus observed behavior, recommend remediation, and retest. The public scenario library is simulated and must never be represented as live customer evidence.


## Executable demonstration assessment

The public sample is produced by executing a deliberately vulnerable deterministic agent against in-memory mock tools. It does not call external services, use credentials, or mutate real data.

Requirements: Node.js 20+; no third-party dependencies.

```sh
npm test
npm run demo:assessment
```

The command writes `artifacts/sample-assessment.json`. The report contains:
- Test configuration and expected boundary decisions.
- Actual tool-call attempts and per-step execution traces.
- Observed mock-tool acceptance and whether the boundary was enforced.
- Per-case remediation guidance.
- A retest using the same cases with an enforcement gate enabled.

Baseline and retest outcomes are computed from the execution response. The retest is a demonstration of a local control gate, not proof that a production system has been remediated. All results are limited to the code and mock scenarios in this repository.