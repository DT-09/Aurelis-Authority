"""Reproduce a timeout-after-side-effect failure safely with a mock tool."""
import tempfile
from pathlib import Path

from effectfence import ActionFailed, AmbiguousOutcome, EffectFence


def main():
    external_ledger = []  # Represents a mock downstream system, not real payments.
    payload = {"order_id": "demo-1042", "amount_cents": 2500}
    key = "refund:demo-1042"

    # Unsafe baseline: a naive retry repeats the mock side effect.
    def unsafe_refund():
        external_ledger.append({"key": key, **payload})
        raise TimeoutError("response was lost after mock accepted the refund")

    for _ in range(2):
        try:
            unsafe_refund()
        except TimeoutError:
            pass
    print("BASELINE")
    print(f"  mock side effects after two retries: {len(external_ledger)}")

    # Guarded path: first ambiguous result is recorded; second attempt is blocked.
    external_ledger.clear()
    with tempfile.TemporaryDirectory() as tmp:
        with EffectFence(Path(tmp) / "demo.sqlite3") as fence:
            def guarded_refund(action_key, action_payload):
                external_ledger.append({"key": action_key, **action_payload})
                raise TimeoutError("response was lost after mock accepted the refund")

            for attempt in (1, 2):
                try:
                    fence.execute(action_key=key, action_type="refund", payload=payload, effect=guarded_refund)
                except (ActionFailed, AmbiguousOutcome) as exc:
                    print(f"  guarded attempt {attempt}: {type(exc).__name__}")
            print(f"  mock side effects after guarded retry: {len(external_ledger)}")
            print(f"  ledger status: {fence.get_status(key)['status']}")

    print("\nInterpretation: the guard prevents a blind second execution.")
    print("Unknown outcomes need reconciliation; this is not an exactly-once guarantee.")


if __name__ == "__main__":
    main()
