import { runSampleAssessment } from "../../src/assessment-runner.mjs";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff"
};

export async function onRequestPost() {
  // Every request executes the deterministic local assessment anew.
  // The agent terminates at in-memory mock tools; no external systems are called.
  const report = runSampleAssessment();
  return new Response(JSON.stringify(report), {
    status: 200,
    headers: jsonHeaders
  });
}
