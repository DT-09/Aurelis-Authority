"""EffectFence: fail-closed execution ledger for state-changing actions."""
from __future__ import annotations

import hashlib
import json
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any, Callable


class EffectFenceError(RuntimeError):
    """Base class for EffectFence errors."""


class ActionKeyConflict(EffectFenceError):
    """An action key was reused with a different action or payload."""


class AmbiguousOutcome(EffectFenceError):
    """A prior attempt may have executed; automatic replay is blocked."""


class ActionFailed(EffectFenceError):
    """The effect function raised; its external outcome may be ambiguous."""


class EffectFence:
    """SQLite-backed action ledger. Safe default: never replay ambiguous work.

    `effect` receives `(action_key, payload)`. Production adapters should pass
    `action_key` as the downstream provider's idempotency key when supported.
    """

    def __init__(self, database: str | Path = "effectfence.sqlite3") -> None:
        self.database = str(database)
        self._lock = threading.RLock()
        self._connection = sqlite3.connect(
            self.database, timeout=10, isolation_level=None, check_same_thread=False
        )
        self._connection.row_factory = sqlite3.Row
        self._connection.execute("PRAGMA journal_mode=WAL")
        self._connection.execute("PRAGMA synchronous=FULL")
        self._connection.execute("""
            CREATE TABLE IF NOT EXISTS actions (
                action_key TEXT PRIMARY KEY,
                action_type TEXT NOT NULL,
                payload_hash TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('started','succeeded','unknown')),
                result_json TEXT,
                error_text TEXT,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            )
        """)

    @staticmethod
    def _payload_hash(action_type: str, payload: dict[str, Any]) -> str:
        canonical = json.dumps(
            {"action_type": action_type, "payload": payload},
            sort_keys=True, separators=(",", ":"), ensure_ascii=False,
        )
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    def execute(
        self,
        *,
        action_key: str,
        action_type: str,
        payload: dict[str, Any],
        effect: Callable[[str, dict[str, Any]], Any],
    ) -> Any:
        if not action_key or not action_key.strip():
            raise ValueError("action_key must be a non-empty stable business-action key")
        if not action_type or not action_type.strip():
            raise ValueError("action_type must be non-empty")
        digest = self._payload_hash(action_type, payload)
        now = time.time()

        # Serialize local callers and commit the reservation before side effects.
        with self._lock:
            self._connection.execute("BEGIN IMMEDIATE")
            try:
                row = self._connection.execute(
                    "SELECT * FROM actions WHERE action_key = ?", (action_key,)
                ).fetchone()
                if row:
                    if row["payload_hash"] != digest:
                        raise ActionKeyConflict(
                            f"Action key {action_key!r} already belongs to a different payload"
                        )
                    if row["status"] == "succeeded":
                        result = json.loads(row["result_json"])
                        self._connection.execute("COMMIT")
                        return result
                    raise AmbiguousOutcome(
                        f"Action {action_key!r} is {row['status']}; refusing automatic replay. "
                        "Reconcile the downstream system or use its idempotency-key lookup."
                    )
                self._connection.execute(
                    "INSERT INTO actions(action_key, action_type, payload_hash, status, created_at, updated_at) "
                    "VALUES (?, ?, ?, 'started', ?, ?)",
                    (action_key, action_type, digest, now, now),
                )
                self._connection.execute("COMMIT")
            except Exception:
                if self._connection.in_transaction:
                    self._connection.execute("ROLLBACK")
                raise

        try:
            result = effect(action_key, payload)
            # JSON storage is intentional: callers receive the same JSON value
            # shape on first execution and on replay.
            result_json = json.dumps(result, sort_keys=True, separators=(",", ":"))
        except Exception as exc:
            with self._lock:
                self._connection.execute(
                    "UPDATE actions SET status='unknown', error_text=?, updated_at=? WHERE action_key=?",
                    (f"{type(exc).__name__}: {exc}"[:2000], time.time(), action_key),
                )
            raise ActionFailed(
                f"Action {action_key!r} failed or returned ambiguously; it is marked unknown "
                "and will not be replayed automatically. Reconcile before retrying."
            ) from exc

        with self._lock:
            self._connection.execute(
                "UPDATE actions SET status='succeeded', result_json=?, updated_at=? WHERE action_key=?",
                (result_json, time.time(), action_key),
            )
        return json.loads(result_json)

    def get_status(self, action_key: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._connection.execute(
                "SELECT action_key, action_type, status, result_json, error_text, created_at, updated_at "
                "FROM actions WHERE action_key=?", (action_key,)
            ).fetchone()
        if row is None:
            return None
        result = dict(row)
        result["result"] = json.loads(result.pop("result_json")) if result["result_json"] else None
        return result

    def close(self) -> None:
        self._connection.close()

    def __enter__(self) -> "EffectFence":
        return self

    def __exit__(self, exc_type: Any, exc: Any, traceback: Any) -> None:
        self.close()
