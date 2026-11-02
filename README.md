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
The initial buyer is a team shipping an AI agent that can take consequential actions through tools or APIs. The initial offer is a scoped assessment of one agent and one workflow: define the authority boundary, run authorized challenges, document expected versus observed behavior, recommend remediation, and retest. The public scenario library is simulated and must never be represented as live customer evidence. The mock gateway defaults to enforcement enabled; the intentionally vulnerable baseline must be selected explicitly by the assessment runner. The demo approval token is a fixed fixture for local tests only and is not an authentication mechanism.


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

## Authority trace regression checker

A separate, dependency-free offline utility audits recorded agent tool-call decisions against a configured authority policy. It can identify unexpected ALLOW decisions for disabled tools, approval-gated amounts, restricted scopes, and revoked identities.

Quick start:

```sh
npm test
npm run authority:check -- --policy tools/authority-trace-check/examples/policy.json --trace tools/authority-trace-check/examples/trace.json
```

Read the [authority trace checker guide](tools/authority-trace-check/README.md) for the input contract, policy schema, CI usage, and limitations. It audits supplied traces only: it does not intercept or prevent actions, and a passing result is not a security certification.


## Trace audit workspace

The deployed `/workspace.html` page lets an assessor submit an exported tool-call trace and an explicit version-1 authority policy to `POST /api/audit-trace`. The endpoint evaluates the supplied decisions using `src/authority-trace-audit.mjs` and returns a JSON report with expected-versus-observed decisions and findings. The request is limited to 1 MB and the endpoint does not persist submitted traces.

This is a real, executable **offline trace audit**, not a live agent integration: it does not invoke or intercept tools, enforce policy inside a customer workflow, authenticate the origin of trace events, or prove trace completeness. Do not submit secrets or unnecessary personal data. A framework-specific live adapter still requires the customer's agreed framework, tool invocation boundary, staging access, and authorization.

Build and tests:

```sh
npm test
npm run build
```


## First paid pilot

The current commercial offer is deliberately narrow: one agent, one consequential workflow, one approved authority policy, sanitized staging traces, one initial audit, and one retest. Read [the first paid pilot scope](docs/first-paid-pilot.md) before making any commercial claim. The current product audits supplied traces; it does not connect to or intercept a live agent.

## Initial prospect research

[Initial prospect research and outreach plan](docs/initial-prospect-research.md) records public evidence for a small set of AI-agent implementation firms, the qualification criteria, and the first outreach sequence. These firms are research targets only; no buying intent is implied.

## Commercial and evidence boundary

The first-pilot price in the internal scope document is a hypothesis, not validated willingness to pay. Do not publish it as an established rate. Do not describe simulated examples as customer results, and do not describe offline trace auditing as penetration testing, runtime enforcement, certification, or proof of complete trace coverage.

## Public service and discovery pages

- [AI agent tool-call trace audit](https://aurelis-authority.pages.dev/ai-agent-tool-call-audit.html) explains the current service scope, supported policy checks, required inputs, deliverables and limitations.
- [Trace audit workspace](https://aurelis-authority.pages.dev/workspace.html) is a public synthetic-data tool for evaluating supplied JSON traces.
- [AI agent authorization field note](https://aurelis-authority.pages.dev/ai-agent-authorization-testing.html) explains the difference between answer-quality evaluation and action-authorization evidence.
- [Inbound acquisition plan](docs/inbound-acquisition-plan.md) records the search, developer-discovery and partner channels. Directory inclusion and customer demand are not assumed.

## Run the trace check in GitHub Actions

The repository exposes a dependency-free composite action. After placing an approved policy and a sanitized trace export in the workflow workspace, call it from a Node.js 20+ runner:

```yaml
- name: Check agent authority trace
  uses: DT-09/Aurelis-Authority@cfc90bcfc0c95f199ef4ac3f1a2c9fd219f12700
  with:
    policy: ./audit/authority-policy.json
    trace: ./audit/tool-call-trace.json
```

The step exits with code `1` when it finds an unexpected ALLOW and code `2` for invalid input. It audits the supplied records only; it does not intercept tools, prove trace completeness or enforce policy at runtime. Pin a reviewed release tag or commit SHA in production workflows rather than relying on `@main`.
