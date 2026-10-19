import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { invokeMockTool } from "../src/policy-gateway.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const policyPath = resolve(root, "tests/comparative/authority.rego");
const opa = process.env.OPA_BIN || (process.argv[2] ? resolve(process.argv[2]) : "opa");
const outputPath = resolve(root, "artifacts/comparative-enforcement-results.json");

const cases = [
  { id: "refund-under-limit", action: "refund.create", args: { amount: 250, approvalToken: null }, expected: "ALLOW" },
  { id: "refund-over-limit-no-approval", action: "refund.create", args: { amount: 900, approvalToken: null }, expected: "DENY" },
  { id: "invoice-after-revocation", action: "invoice.send", args: { identityStatus: "revoked" }, expected: "DENY" },
  { id: "unknown-admin-tool", action: "admin.deleteUser", args: { userId: "synthetic-user" }, expected: "DENY" }
];

function opaDecision(testCase) {
  const result = spawnSync(opa, [
    "eval", "--format=json", "--data", policyPath,
    "--input", "-", "data.aurelis.allow"
  ], {
    input: JSON.stringify(testCase),
    encoding: "utf8",
    timeout: 15000
  });
  if (result.error) throw new Error(`Could not execute OPA (${opa}): ${result.error.message}`);
  if (result.status !== 0) throw new Error(`OPA evaluation failed for ${testCase.id}: ${result.stderr || result.stdout}`);
  const parsed = JSON.parse(result.stdout);
  const value = parsed?.result?.[0]?.expressions?.[0]?.value;
  if (typeof value !== "boolean") throw new Error(`OPA returned no boolean decision for ${testCase.id}: ${result.stdout}`);
  return value ? "ALLOW" : "DENY";
}

function mockState() {
  return { acceptedActions: [], rejectedActions: [] };
}
function applyToMockTool(state, testCase, decision, source) {
  if (decision === "ALLOW") {
    state.acceptedActions.push({ id: testCase.id, action: testCase.action, source });
    return true;
  }
  state.rejectedActions.push({ id: testCase.id, action: testCase.action, source });
  return false;
}

const rows = [];
for (const testCase of cases) {
  // No-control baseline: the tool accepts every attempted call.
  const baselineState = mockState();
  const baselineGateway = invokeMockTool(
    { action: testCase.action, args: testCase.args },
    { enforcePolicy: false }
  );
  applyToMockTool(baselineState, testCase, baselineGateway.decision, "no-control-baseline");

  // OPA is the established policy-engine comparator. Its decision gates tool invocation.
  const opa = opaDecision(testCase);
  const opaState = mockState();
  const opaAccepted = applyToMockTool(opaState, testCase, opa, "opa-policy-gate");

  // Aurelis uses the actual repository gateway, not a reimplementation of its policy.
  const aurelisState = mockState();
  const aurelisGateway = invokeMockTool(
    { action: testCase.action, args: testCase.args },
    { enforcePolicy: true }
  );
  const aurelisAccepted = aurelisGateway.accepted;
  applyToMockTool(aurelisState, testCase, aurelisAccepted ? "ALLOW" : "DENY", "aurelis-policy-gateway");

  rows.push({
    id: testCase.id,
    action: testCase.action,
    expected: testCase.expected,
    baseline: {
      decision: baselineGateway.decision,
      toolAccepted: baselineGateway.accepted,
      matchesExpected: baselineGateway.decision === testCase.expected,
      resultingState: baselineState
    },
    opa: {
      decision: opa,
      toolAccepted: opaAccepted,
      matchesExpected: opa === testCase.expected,
      resultingState: opaState
    },
    aurelis: {
      decision: aurelisAccepted ? "ALLOW" : "DENY",
      toolAccepted: aurelisAccepted,
      gatewayReason: aurelisGateway.reason,
      gatewayChecks: aurelisGateway.checks,
      matchesExpected: (aurelisAccepted ? "ALLOW" : "DENY") === testCase.expected,
      resultingState: aurelisState
    }
  });
}

const summarize = key => ({
  cases: rows.length,
  correctDecisions: rows.filter(r => r[key].matchesExpected).length,
  unauthorizedActionsAccepted: rows.filter(r => r.expected === "DENY" && r[key].toolAccepted).length,
  authorizedActionsBlocked: rows.filter(r => r.expected === "ALLOW" && !r[key].toolAccepted).length,
  acceptedToolCalls: rows.filter(r => r[key].toolAccepted).length
});
const report = {
  schemaVersion: "1.0",
  title: "Aurelis Authority vs Open Policy Agent (OPA)",
  status: "LOCAL_SIMULATION",
  generatedAt: new Date().toISOString(),
  comparator: {
    name: "Open Policy Agent",
    type: "General-purpose policy engine",
    policyFile: "tests/comparative/authority.rego",
    note: "OPA is a real existing policy engine; this harness supplies a test policy and gates mock tool acceptance. This is not a comparison against a turnkey AI-agent security product."
  },
  scope: {
    realExternalSystems: false,
    externalNetworkCallsByTest: false,
    externalSideEffects: false,
    liveAgentTested: false,
    cases: cases.length,
    note: "All tool effects are in-memory simulation. OPA CLI is executed locally."
  },
  summary: {
    noControl: summarize("baseline"),
    opa: summarize("opa"),
    aurelis: summarize("aurelis"),
    aurelisVsOpaUnauthorizedAcceptsAvoided: summarize("opa").unauthorizedActionsAccepted - summarize("aurelis").unauthorizedActionsAccepted
  },
  cases: rows,
  verdict: "COMPARATIVE_RESULT_ONLY",
  interpretation: "If OPA and Aurelis both block the same cases, this test does not establish Aurelis superiority. Any difference must be reproduced and investigated; it must not be manufactured by weakening the comparator policy."
};

await mkdir(resolve(root, "artifacts"), { recursive: true });
await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ output: "artifacts/comparative-enforcement-results.json", summary: report.summary, verdict: report.verdict }, null, 2));
if (rows.some(r => !r.opa.matchesExpected || !r.aurelis.matchesExpected)) process.exitCode = 1;
