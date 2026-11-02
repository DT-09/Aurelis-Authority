import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { runSampleAssessment } from "../src/assessment-runner.mjs";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("index.html", "dist/index.html");
await cp("workspace.html", "dist/workspace.html");
await cp("ai-agent-tool-call-audit.html", "dist/ai-agent-tool-call-audit.html");
await cp("ai-agent-authorization-testing.html", "dist/ai-agent-authorization-testing.html");
await cp("privacy.html", "dist/privacy.html");
await mkdir("dist/admin", { recursive: true });
await cp("admin/leads.html", "dist/admin/leads.html");
await cp("src", "dist/src", { recursive: true });

const report = runSampleAssessment();
await writeFile("dist/sample-assessment.json", JSON.stringify(report, null, 2) + "\n");
console.log(`Aurelis Authority build complete. Executed ${report.summary.baseline.total} baseline and ${report.summary.retest.total} retest cases; baseline failures: ${report.summary.baseline.fail}; retest passes: ${report.summary.retest.pass}. Mock tools only; no external systems contacted.`);
