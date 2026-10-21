import { auditTrace } from "../../src/authority-trace-audit.mjs";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff"
};
const MAX_BODY_BYTES = 1_000_000;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

export async function onRequestPost({ request }) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json({ error: "Content-Type must be application/json." }, 415);
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return json({ error: "Request body exceeds the 1 MB limit." }, 413);
  }

  let raw;
  try {
    raw = await request.text();
  } catch {
    return json({ error: "Unable to read request body." }, 400);
  }

  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return json({ error: "Request body exceeds the 1 MB limit." }, 413);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return json({ error: "Request body must be an object containing policy and trace." }, 400);
  }

  try {
    const report = auditTrace({ policy: payload.policy, trace: payload.trace });
    return json({
      ...report,
      generatedAt: new Date().toISOString(),
      inputHandling: {
        persisted: false,
        externalSystemsContacted: false,
        note: "The supplied trace was evaluated in this request and was not stored by this endpoint."
      }
    });
  } catch (error) {
    return json({
      error: "Trace audit could not be completed.",
      detail: error instanceof Error ? error.message : "Invalid policy or trace."
    }, 400);
  }
}
