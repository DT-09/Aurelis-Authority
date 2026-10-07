export async function onRequestGet({ params, env }) {
  const token = params.token;
  if (!token || !env.DB) return Response.json({error:'Not configured'}, {status:503});
  const row = await env.DB.prepare(`SELECT id, status, agent_name, workflow_name, scope, summary, updated_at FROM assessments WHERE access_token = ?1`).bind(token).first();
  if (!row) return Response.json({error:'Assessment not found'}, {status:404});
  const findings = await env.DB.prepare(`SELECT id, title, severity, status, declared_authority, observed_capability, business_impact, recommendation FROM findings WHERE assessment_id = ?1 ORDER BY severity_rank DESC, id`).bind(row.id).all();
  const tests = await env.DB.prepare(`SELECT id, category, scenario, expected_decision, observed_decision, status FROM assessment_tests WHERE assessment_id = ?1 ORDER BY id`).bind(row.id).all();
  return Response.json({assessment:row, findings:findings.results, tests:tests.results}, {headers:{'Cache-Control':'no-store'}});
}
