import { demoConfig, evaluateScenario } from "./demo-agent.mjs";

export function runSampleAssessment({ generatedAt = new Date().toISOString() } = {}) {
  const runId = "AUR-RUN-" + generatedAt.replace(/[^0-9]/g, "").slice(0, 14);
  const baseline = demoConfig.scenarios.map(s => evaluateScenario(s, { enforcePolicy: false, runId: runId + "-baseline" }));
  const retest = demoConfig.scenarios.map(s => evaluateScenario(s, { enforcePolicy: true, runId: runId + "-retest" }));
  const cases = baseline.map((initial, i) => ({
    ...initial,
    retest: {
      expected: retest[i].expected,
      observed: retest[i].observed,
      outcome: retest[i].outcome,
      boundaryEnforced: retest[i].execution.boundaryEnforced,
      toolAccepted: retest[i].execution.toolAccepted,
      externalSideEffects: retest[i].execution.externalSideEffects,
      trace: retest[i].trace
    }
  }));
  const tally = rows => ({
    total: rows.length,
    pass: rows.filter(r => r.outcome === "PASS").length,
    fail: rows.filter(r => r.outcome === "FAIL").length,
    inconclusive: rows.filter(r => r.outcome === "INCONCLUSIVE").length
  });
  return {
    schemaVersion: "2.0",
    assessmentId: runId,
    title: "Aurelis Authority — Executable Demo Assessment",
    generatedAt,
    status: "DEMONSTRATION_ONLY",
    configuration: {
      ...demoConfig,
      scenarios: demoConfig.scenarios.map(({ id, name, boundary, action, args, expected }) => ({ id, name, boundary, action, args, expected })),
      baselineMode: "vulnerable agent path; policy evaluated but not enforced",
      retestMode: "same scenarios through mock gateway with policy enforcement enabled",
      command: "npm run demo:assessment",
      testCommand: "npm test"
    },
    scope: {
      target: "Deliberately vulnerable local demonstration agent",
      environment: demoConfig.environment,
      liveAgentTested: false,
      externalSystemsContacted: false,
      externalNetwork: false,
      externalSideEffects: false,
      limitations: [
        "This is a deterministic demonstration using in-memory mock tools, not a live model or customer deployment.",
        "The baseline agent intentionally attempts every configured tool call; mock tools can record acceptance but never mutate external state.",
        "The retest toggles an in-process enforcement gate to demonstrate the control and does not establish that any production system has been remediated.",
        "Results are not a security certification and do not generalize beyond these scenarios and this code."
      ]
    },
    summary: {
      baseline: tally(cases),
      retest: tally(cases.map(c => c.retest)),
      baselineBoundaryEnforced: cases.filter(c => c.execution.boundaryEnforced).length,
      retestBoundaryEnforced: cases.filter(c => c.retest.boundaryEnforced).length
    },
    cases
  };
}
