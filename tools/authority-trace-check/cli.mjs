#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { auditTrace } from "../../src/authority-trace-audit.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!["--policy", "--trace", "--format"].includes(token)) {
      throw new Error(`Unknown argument: ${token}`);
    }
    const value = argv[++i];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${token}`);
    args[token.slice(2)] = value;
  }
  if (!args.policy || !args.trace) throw new Error("Usage: node tools/authority-trace-check/cli.mjs --policy <policy.json> --trace <trace.json> [--format json|text]");
  if (args.format && !["json", "text"].includes(args.format)) throw new Error("--format must be json or text");
  return { ...args, format: args.format || "text" };
}

try {
  const args = parseArgs(process.argv.slice(2));
  const policy = JSON.parse(await readFile(args.policy, "utf8"));
  const trace = JSON.parse(await readFile(args.trace, "utf8"));
  const report = auditTrace({ policy, trace });

  if (args.format === "json") {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(`Authority trace audit: ${report.status}\n`);
    process.stdout.write(`Events: ${report.summary.events} | Matched: ${report.summary.matched} | Unexpected allows: ${report.summary.unexpectedAllows} | Unexpected denies: ${report.summary.unexpectedDenies}\n`);
    for (const finding of report.findings) {
      process.stdout.write(`[${finding.severity}] ${finding.id} ${finding.tool}: expected ${finding.expected}, observed ${finding.observed} (${finding.policyReason})\n`);
    }
    process.stdout.write("Mode: offline trace audit; no tools executed and no enforcement applied.\n");
  }

  if (report.summary.unexpectedAllows > 0) process.exitCode = 1;
} catch (error) {
  process.stderr.write(`authority-trace-check: ${error.message}\n`);
  process.exitCode = 2;
}
