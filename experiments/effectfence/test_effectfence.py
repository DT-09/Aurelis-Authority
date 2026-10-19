import tempfile
import threading
import unittest
from pathlib import Path

from effectfence import ActionFailed, ActionKeyConflict, AmbiguousOutcome, EffectFence


class EffectFenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db = Path(self.temp.name) / "test.sqlite3"
        self.fence = EffectFence(self.db)

    def tearDown(self):
        self.fence.close()
        self.temp.cleanup()

    def test_repeated_success_returns_recorded_result_without_second_effect(self):
        calls = []
        def effect(key, payload):
            calls.append((key, payload))
            return {"refund_id": "rf_123", "status": "accepted"}
        args = dict(action_key="refund:order-7", action_type="refund", payload={"cents": 2500}, effect=effect)
        first = self.fence.execute(**args)
        second = self.fence.execute(**args)
        self.assertEqual(first, second)
        self.assertEqual(len(calls), 1)

    def test_different_payload_cannot_reuse_key(self):
        effect = lambda key, payload: {"ok": True}
        self.fence.execute(action_key="ticket:7", action_type="create_ticket", payload={"title": "A"}, effect=effect)
        with self.assertRaises(ActionKeyConflict):
            self.fence.execute(action_key="ticket:7", action_type="create_ticket", payload={"title": "B"}, effect=effect)

    def test_ambiguous_timeout_is_not_replayed(self):
        side_effects = []
        def effect(key, payload):
            side_effects.append({"key": key, **payload})
            raise TimeoutError("response lost after mock side effect")
        args = dict(action_key="refund:order-9", action_type="refund", payload={"cents": 5000}, effect=effect)
        with self.assertRaises(ActionFailed):
            self.fence.execute(**args)
        with self.assertRaises(AmbiguousOutcome):
            self.fence.execute(**args)
        self.assertEqual(len(side_effects), 1)
        self.assertEqual(self.fence.get_status("refund:order-9")["status"], "unknown")

    def test_ledger_survives_reopen_and_blocks_ambiguous_replay(self):
        calls = []
        def effect(key, payload):
            calls.append(key)
            raise TimeoutError("simulated crash window")
        with self.assertRaises(ActionFailed):
            self.fence.execute(action_key="send:case-2", action_type="send_message", payload={"body": "hello"}, effect=effect)
        self.fence.close()
        self.fence = EffectFence(self.db)
        with self.assertRaises(AmbiguousOutcome):
            self.fence.execute(action_key="send:case-2", action_type="send_message", payload={"body": "hello"}, effect=effect)
        self.assertEqual(calls, ["send:case-2"])

    def test_concurrent_same_key_fails_closed_without_duplicate_effect(self):
        calls = []
        effect_entered = threading.Event()
        release_effect = threading.Event()
        outcomes = []
        def effect(key, payload):
            calls.append(key)
            effect_entered.set()
            if not release_effect.wait(timeout=3):
                raise TimeoutError("test synchronization timed out")
            return {"ok": True}
        def run():
            try:
                outcomes.append(self.fence.execute(action_key="job:1", action_type="create_job", payload={"x": 1}, effect=effect))
            except Exception as exc:
                outcomes.append(exc)
        first = threading.Thread(target=run)
        first.start()
        self.assertTrue(effect_entered.wait(timeout=2), "first effect did not start")
        second = threading.Thread(target=run)
        second.start()
        second.join(2)
        release_effect.set()
        first.join(3)
        self.assertFalse(first.is_alive())
        self.assertFalse(second.is_alive())
        self.assertEqual(len(calls), 1)
        self.assertEqual(sum(isinstance(x, dict) for x in outcomes), 1)
        self.assertEqual(sum(isinstance(x, AmbiguousOutcome) for x in outcomes), 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
