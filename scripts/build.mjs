import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { runSampleAssessment } from "../src/assessment-runner.mjs";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("index.html", "dist/index.html");
await cp("src", "dist/src", { recursive: true });

const report = runSampleAssessment();
await writeFile("dist/sample-assessment.json", JSON.stringify(report, null, 2) + "\n");

console.log(`Aurelis Authority build complete. Sample report: ${report.summary.total} deterministic fixture cases; no external systems contacted.`);
