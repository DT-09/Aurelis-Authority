# EffectFence — execution safety for state-changing agent tools

EffectFence is a small, dependency-free Python prototype for one specific failure: an agent's state-changing tool call may succeed remotely while the response is lost, after which the agent retries and repeats the action.

## What this prototype guarantees

- Persists an action key and `started` state in SQLite before calling the effect function.
- Returns the stored result for a repeated key whose first execution completed and was recorded.
- **Fails closed** when a previous attempt is still `started` or ended ambiguously. It does not blindly execute the action again.
- Includes a deterministic demonstration and tests for duplicate suppression, ambiguous outcomes, and concurrent duplicate requests.

## Critical limitation

EffectFence cannot make an arbitrary external API call atomic with its local SQLite database. If a process dies after the external side effect but before recording success, the result is ambiguous. This prototype refuses an automatic retry rather than claiming exactly-once execution. Recovery requires reconciliation or downstream idempotency support. For production integrations, prefer passing the same idempotency key to the downstream API and reconciling unknown outcomes.

The demo uses only an in-memory mock billing tool. It does not call a payment provider, send messages, use credentials, or change real customer data.

## Run

Python 3.11+ recommended; standard library only.

```powershell
cd experiments/effectfence
python -m unittest -v
python demo.py
```

## API sketch

```python
with EffectFence("effectfence.sqlite3") as fence:
    result = fence.execute(
        action_key="refund:order-1042",
        action_type="issue_refund",
        payload={"order_id": "1042", "amount_cents": 2500},
        effect=mock_or_integrated_effect,
    )
```

Keys must represent one logical business action. Do not use a fresh random key for each retry; that defeats deduplication. Do not reuse a key for a different payload: EffectFence rejects it.

## Status

Prototype / local proof of concept. Not a security certification, not a distributed lock service, and not yet a production-ready payment middleware. The next commercial gate is an integration test against a real customer's staging workflow and evidence that the current stack leaves a costly gap.