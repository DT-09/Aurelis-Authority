## Inbound lead capture and measurement

This change adds server-side enquiry capture to Cloudflare D1, buyer qualification fields, a honeypot, a per-email submission limit, and anonymous aggregate counts for page views, workspace opens, successful audits, form opens and submissions. It does not store IP addresses, cookies or trace contents in analytics.

### Required Cloudflare setup

1. Apply the migration from the repository root: `npx wrangler d1 migrations apply aurelis-authority --remote`
2. Set a strong secret: `npx wrangler pages secret put LEAD_ADMIN_TOKEN --project-name aurelis-authority`
3. Confirm the Pages D1 binding is named `DB` and points to the existing `aurelis-authority` database.
4. For inbox alerts, configure `RESEND_API_KEY` as a Pages secret and set `LEAD_NOTIFY_TO` plus `LEAD_FROM_EMAIL` as Pages environment variables. The sender domain must be verified with Resend. Without these values, leads are stored in D1 but no email alert is sent.
4. Push/merge main after adding the repository secrets. Confirm the deployment on Cloudflare Pages, then submit one test enquiry using an email address you control.

### Read enquiries and metrics

GET `/api/admin/leads?days=7` with header `Authorization: Bearer YOUR_LEAD_ADMIN_TOKEN`. Keep the URL and token private. The endpoint returns the last 100 leads plus aggregate event counts. It returns 404 if the token is missing or wrong.

### Metrics definitions

- `page_view`: page load; repeat loads count again.
- `workspace_open`: visit to the free trace workspace.
- `audit_success`: successful trace evaluation response.
- `lead_form_open`: enquiry dialog opened.
- `lead_submit`: enquiry accepted by the API.

Counts are not unique visitors or verified people. A qualified enquiry requires human review against the buyer criteria. D1 stores leads but does not send email notifications; check the private endpoint until an approved notification provider is configured.

### Qualification

Prioritize a buyer with a tool-using agent, a consequential action, a named technical/policy owner, a staging trace export ready or realistically available, and a release/sign-off decision within seven days. Do not ask prospects to submit credentials, production data or raw traces through the public form.
