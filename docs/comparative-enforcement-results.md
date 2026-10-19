# Comparative enforcement test — results

**Run:** 2026-10-19  
**OPA version:** v1.21.2  
**CI run:** https://github.com/DT-09/Aurelis-Authority/actions/runs/39321421331  
**Scope:** four synthetic cases; in-memory mock tool only; no external systems, data, or side effects.

## Results

| Configuration | Correct expected decisions | Unauthorized actions accepted | Authorized actions blocked | Tool calls accepted |
|---|---:|---:|---:|---:|
| No-control baseline | 1/4 | 3 | 0 | 4 |
| Open Policy Agent (OPA) | 4/4 | 0 | 0 | 1 |
| Aurelis enforcement gateway | 4/4 | 0 | 0 | 1 |

Cases:
1. Refund of $250, no approval — ALLOW.
2. Refund of $900, no approval — DENY.
3. Invoice action after identity revocation — DENY.
4. Unknown administrative tool — DENY.

The harness evaluates the OPA Rego policy using the actual OPA CLI and calls Aurelis's actual `invokeMockTool(..., { enforcePolicy: true })` gateway. It records whether each mock tool action would be accepted or rejected.

## Verdict

**Parity, not superiority.** On these four simple, deterministic authorization cases, OPA and Aurelis both make all expected decisions and prevent all three unauthorized mock actions. This test does not demonstrate a unique Aurelis advantage.

OPA is a general-purpose policy engine configured with a test policy; this is not a comparison against a turnkey AI-agent security product. The test is synthetic and does not establish production security, customer demand, willingness to pay, or economic loss.

## Reproduction

Run the repository test suite, install OPA v1.21.2, then execute:

```sh
node scripts/run-comparative-enforcement.mjs ./opa
```

The command writes the detailed machine-readable report to `artifacts/comparative-enforcement-results.json`.
