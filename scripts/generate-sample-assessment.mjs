import { mkdir, writeFile } from "node:fs/promises";
import { runSampleAssessment } from "../src/assessment-runner.mjs";

const report = runSampleAssessment();
await mkdir("dist", { recursive: true });
await writeFile("dist/sample-assessment.json", JSON.stringify(report, null, 2) + "\n");
console.log(`Sample assessment generated: ${report.summary.total} fixture cases, ${report.summary.fail} expected boundary failures. No external systems contacted.`);
