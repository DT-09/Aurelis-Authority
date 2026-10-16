import { mkdir, writeFile } from "node:fs/promises";
import { runSampleAssessment } from "../src/assessment-runner.mjs";

const report = runSampleAssessment();
await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/sample-assessment.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({
  assessmentId: report.assessmentId,
  baseline: report.summary.baseline,
  retest: report.summary.retest,
  externalNetwork: report.scope.externalNetwork,
  externalSideEffects: report.scope.externalSideEffects,
  output: "artifacts/sample-assessment.json"
}, null, 2));
