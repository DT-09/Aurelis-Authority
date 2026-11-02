# Aurelis Authority — initial prospect research

**Research date:** 2 November 2026  
**Purpose:** Identify firms whose public service descriptions show that they build or deploy tool-using AI agents, and therefore may have a reason to add an independent action-boundary review.

These are qualified research targets, not confirmed leads. No company below has expressed interest in Aurelis.

## Priority prospects

| Priority | Company | Public evidence of fit | Suggested buyer | Public route |
|---|---|---|---|---|
| 1 | xFlow | Describes agent workflows involving Stripe, Shopify, Cal.com, refunds, booking, escalation and integrations. | Founder / Head of Engineering | https://xflow.in/ |
| 2 | Tech Inject | Describes agents for support, refunds, order exceptions and API-connected workflows; publishes fixed-scope agent work. | Founder / AI delivery lead | https://www.techinject.in/services/ai-agent-development |
| 3 | MappOptimist | Describes production AI agents, tool calling, multi-agent systems, evaluation, guardrails and human approval. | Founder / Delivery Director | https://www.mappoptimist.com/services/ai-agent-development |
| 4 | HERE AND NOW AI | Describes production agents using tools and APIs, with guardrails, human checkpoints and observability. | AI practice lead / CTO | https://hereandnowai.com/services/ai-agents/ |
| 5 | IntelliForge AI | Hyderabad-based AI agent and workflow automation provider. Useful secondary prospect, but the first campaign should remain global. | Founder / AI delivery lead | https://www.intelliforge.tech/ |

## Why these prospects

- xFlow publicly describes agent procedures for refunds and external SaaS tools. That is a direct match for action-boundary testing.
- Tech Inject describes customer-support and order-exception agents that can perform business actions.
- MappOptimist and HERE AND NOW AI publicly position around production agents, integrations, and governance controls. The pitch must therefore be about independent evidence and regression testing, not generic "AI safety."
- IntelliForge is geographically close, but is secondary to the global-first sales strategy.

## Competitive landscape and channel signals

### Direct / adjacent providers

- Subcloak offers AI agent access audits and pentests, including white-label delivery and partner discounts. This confirms a partner channel exists, but it is also a direct competitor. Do not pitch Aurelis as a replacement for its broader penetration-testing service. https://subcloak.com/partners/
- SilverXAI offers independent and white-label AI security testing for AI implementation firms. Direct/adjacent competitor. https://www.silverxai.com/partners
- TrendLab describes an agency evaluation partner program as a pilot and says it has not yet delivered that procedure to a client. It is not evidence of an established channel. https://www.trendlabanalytics.com/ai-agent-assurance/services
- Gamut Assure describes referral and delivery partner routes for AI governance services. Possible future channel, but likely broader and more mature than Aurelis's current capability. https://gamutassure.com/partners/

### Positioning boundary

Aurelis should not claim to be a penetration-testing provider, runtime enforcement product, or broad AI governance platform. Its current defensible offer is narrower:

**An independent, policy-based audit of supplied AI-agent tool-call traces, with explicit expected-versus-observed decisions and regression evidence.**

This is complementary to a broader security review, but may overlap with an agency's own QA. The sales conversation must establish whether the agency lacks independent evidence, lacks a repeatable review process, or needs an external report for client sign-off.

## First outreach sequence

1. Start with xFlow and Tech Inject because their public descriptions include consequential tool workflows.
2. Ask whether they currently test action authorization separately from answer quality and general application security.
3. Show the offline trace-audit example and its explicit limits.
4. Offer the fixed-scope pilot only if they can supply a sanitized staging trace and an approved policy.
5. If they have no need, ask whether a client or partner has this requirement; do not push a generic AI security pitch.

## Qualification questions

- Which agent workflow can issue or modify consequential actions?
- How are tool permissions and approval thresholds defined?
- Are expected and observed tool decisions recorded in an exportable trace?
- Who reviews authorization failures before release?
- Would an independent, repeatable report help client sign-off or release governance?
- Is there a specific upcoming deployment that could support a paid pilot?

## Outreach draft

Respected [Name],

Your published work includes AI agents that interact with business tools and execute operational workflows.

Aurelis is developing a narrow, independent review of agent action boundaries. It compares a customer-approved authority policy with sanitized staging tool-call traces, identifies unexpected ALLOW/DENY decisions, and produces evidence-linked findings with a retest.

This is not a penetration test or runtime enforcement product. The current pilot is limited to one agent and one workflow.

Would this kind of independent authorization evidence be useful in your pre-release or client handover process?

Regards,  
Dhairy  
Aurelis Authority

## Evidence sources

- xFlow: https://xflow.in/
- Tech Inject: https://www.techinject.in/services/ai-agent-development
- MappOptimist: https://www.mappoptimist.com/services/ai-agent-development
- HERE AND NOW AI: https://hereandnowai.com/services/ai-agents/
- IntelliForge AI: https://www.intelliforge.tech/
- Subcloak partner programme: https://subcloak.com/partners/
- SilverXAI partner programme: https://www.silverxai.com/partners
- TrendLab services and partner programme: https://www.trendlabanalytics.com/ai-agent-assurance/services
- Gamut Assure partner network: https://gamutassure.com/partners/

## Important limitation

Public website claims establish only that these firms describe relevant services. They do not establish current buying intent, budget, the existence of an unaddressed assurance gap, or willingness to pay Aurelis. Those must be validated directly.
