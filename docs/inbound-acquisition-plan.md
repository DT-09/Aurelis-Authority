# Aurelis Authority — inbound acquisition plan

**Objective:** Generate qualified inbound enquiries for the existing offline AI-agent tool-call trace audit. This plan does not assume demand, conversion, or revenue; each must be measured.

## The offer we can honestly sell today

An independent, policy-based review of one AI agent's exported, sanitized staging tool-call trace against one customer-approved version-1 authority policy. The pilot includes up to 12 agreed scenarios, up to 1,000 events per audit, one initial audit, one retest review and one technical findings discussion.

The customer runs all test cases in its own authorized staging environment and supplies the trace. Aurelis does not connect to or intercept a live agent, enforce controls, perform penetration testing, authenticate trace origins, prove trace completeness, or authenticate an approver. The approval check currently verifies only that a configured approval value is non-empty.

## Positioning

**Primary search phrase:** AI agent tool-call trace audit  
**Supporting phrases:** AI agent authorization testing; AI agent permission boundary review; agent tool-call policy audit; AI agent action authorization evidence; AI agent trace audit.

Avoid broad claims such as AI security platform, runtime guardrails, penetration testing, certification, or autonomous red teaming. They describe capabilities Aurelis does not currently provide.

## Inbound funnel

1. **Discovery:** searchable service page, technical documentation, open-source CLI, and relevant tool directories.
2. **Proof:** free trace workspace and reproducible synthetic sample. The sample must remain clearly marked as simulated.
3. **Qualification:** visitor has a tool-using agent, consequential workflow, approved policy, sanitized staging export, technical owner and a real release/sign-off need.
4. **Conversion:** scoped discussion, written statement of work and adult-authorized commercial/payment arrangements.
5. **Repeat:** one retest, then offer a new audit for a later agent/workflow release only if the first review proves useful.

## Channels to build

### 1. Search discovery
- Main page: concise description of the service and the offline limitation.
- Dedicated page: `/ai-agent-tool-call-audit.html` with supported checks, required inputs, deliverables, limitations and FAQs.
- Publish one technical article explaining how to compare recorded tool decisions with a policy. Use examples that are synthetic and reproducible.
- Add and maintain `robots.txt` and `sitemap.xml`.
- Track search impressions, clicks and qualified enquiries. Do not treat page views as buyer demand.

### 2. Product-led developer discovery
- Keep the trace checker CLI documented, dependency-light and reproducible.
- Make the sample policy and trace runnable from a clean checkout.
- Add a concise "known limitations" section beside every demo.
- Consider a public directory submission only as an open-source developer utility, not as an accredited audit firm or security certification provider.

### 3. Relevant directories
Potential fit to assess before submission:
- AgentFirst Directory: accepts evidence-reviewed agent-first tools and has an Agent Testing & QA category. Submit the open-source trace-checking utility only if its inclusion policy accepts this scope.
- AgentDrawer: curated AI-agent tool directory with a submit route; list the CLI utility, not a broad assurance service.
- Shiplog Tools: tracks agent tooling across categories including security and guardrails; verify its current submission policy before requesting inclusion.

Do not claim listing, endorsement, verification, ranking or accreditation until the directory publishes it. The Agent Index auditor registry is not a shortcut: it describes registry-listed audit firms and must not be presented as a suitable listing without meeting its stated requirements.

### 4. Evidence-led content
Publish practical, narrow pieces:
- "What an AI agent tool-call trace can prove—and what it cannot"
- "How to compare ALLOW/DENY decisions with an authority policy"
- "A staging checklist for refund, record-change and restricted-data agent workflows"
- "Why answer-quality evaluation does not establish action authorization"

Each article should include a runnable synthetic example, source code, scope boundary and a single CTA to the free trace workspace. No invented incidents, customer results, savings, accuracy or testimonials.

### 5. Partner-led discovery
The best partner candidates are AI implementation agencies and agent QA teams that already deliver tool-using workflows. Their client handover process may need a neutral policy-to-trace evidence step. Qualify the need first; do not imply that their existing controls are inadequate.

## External context worth referencing carefully

CERT-In Advisory CIAD-2026-0049, issued 15 October 2026, describes cases where agents exceeded task authorization during research/evaluation and accessed Indian organizations' live systems. It recommends isolating evaluation workloads, using synthetic targets/credentials and defining in-scope actions. This is evidence that task-authority boundaries matter; it is not evidence that Aurelis has mitigated those incidents or provides the controls CERT-In recommends.

## Qualification gate

Advance only when all are true:
- The prospect has an agent that calls business tools or APIs.
- At least one action is consequential (refund, payment, record change, restricted data access, approval or deletion).
- A customer-approved policy exists or can be approved.
- Sanitized staging traces can be exported in the supported JSON format or mapped to it.
- A technical owner and a budget owner are identifiable.
- The buyer agrees that an offline trace review is useful and understands its limitations.

If the prospect needs live interception, runtime enforcement, penetration testing, certification or proof of trace authenticity/completeness, do not sell the current service as a substitute.

## Measurement

Record weekly:
- Search impressions and clicks for the target phrases.
- Visits to the service page and trace workspace.
- Workspace audit starts and successful report downloads (aggregate only; do not collect trace content for analytics).
- Enquiries received.
- Qualified enquiries.
- Scoping calls held.
- Written proposals issued.
- Paid pilots accepted.
- Repeat audits.

The funnel is working only when it produces qualified conversations and paid pilots. Traffic alone is not success.

## Current gaps before scaling acquisition

- Contact CTA currently opens a prefilled email draft; it does not submit a server-side lead form or notify an inbox automatically.
- No analytics or conversion event instrumentation is confirmed.
- No public customer case study or third-party validation exists.
- The live Cloudflare deployment must be checked after merge; GitHub CI success alone does not prove deployment.
- Contract, invoicing and payment must use an adult-authorized, legally appropriate arrangement.
