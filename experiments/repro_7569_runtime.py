"""Run the AG-UI #7569 scenario against a checked-out Agent Framework revision.

This executes the upstream run_agent_stream implementation with local deterministic
tools and a scripted agent. It uses no model API, credentials, or external side effects.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from agent_framework import AgentResponseUpdate, Content, FunctionTool
from agent_framework_ag_ui._agent import AgentConfig
from agent_framework_ag_ui._agent_run import run_agent_stream
from conftest import StubAgent


def event_to_dict(event: Any) -> dict[str, Any]:
    if hasattr(event, "model_dump"):
        return event.model_dump(mode="json", by_alias=True, exclude_none=True)
    if hasattr(event, "dict"):
        return event.dict(by_alias=True, exclude_none=True)
    if isinstance(event, dict):
        return event
    return {"type": getattr(event, "type", type(event).__name__), "repr": repr(event)}


async def run_scenario(case_id: str, calls: list[dict[str, Any]], decisions: dict[str, bool]) -> dict[str, Any]:
    executed: list[dict[str, str]] = []
    tools: list[FunctionTool] = []

    for call in calls:
        call_id = call["id"]
        tool_name = call["name"]
        target = call["arguments"]["target"]

        def execute(target: str, *, _call_id: str = call_id, _tool_name: str = tool_name) -> str:
            executed.append({"callId": _call_id, "tool": _tool_name, "target": target})
            return f"{_tool_name} completed {target}"

        tools.append(
            FunctionTool(
                name=tool_name,
                description=f"Deterministic local test tool {tool_name}",
                func=execute,
                approval_mode="always_require",
            )
        )

    agent = StubAgent(
        updates=[AgentResponseUpdate(contents=[Content.from_text(text="Resume completed.")], role="assistant")],
        default_options={"tools": tools},
    )
    resume_messages: list[dict[str, Any]] = [
        {"role": "user", "content": f"Run scenario {case_id}"},
        {
            "role": "assistant",
            "content": "",
            "tool_calls": [
                {
                    "id": call["id"],
                    "type": "function",
                    "function": {
                        "name": call["name"],
                        "arguments": json.dumps(call["arguments"], sort_keys=True),
                    },
                }
                for call in calls
            ],
        },
    ]
    resolved_interrupts: list[dict[str, Any]] = []
    for call in calls:
        accepted = decisions[call["id"]]
        resume_messages.append(
            {
                "role": "tool",
                "content": json.dumps({"accepted": accepted}),
                "toolCallId": call["id"],
            }
        )
        resolved_interrupts.append(
            {
                "interruptId": call["id"],
                "status": "resolved",
                "payload": {"accepted": accepted},
            }
        )

    input_data: dict[str, Any] = {
        "thread_id": f"aurelis-{case_id}",
        "run_id": f"aurelis-{case_id}-resume",
        "messages": resume_messages,
    }
    events: list[dict[str, Any]] = []
    async for event in run_agent_stream(input_data, agent, AgentConfig()):
        events.append(event_to_dict(event))

    return {
        "caseId": case_id,
        "initialToolCalls": [
            {"id": call["id"], "name": call["name"], "arguments": call["arguments"]}
            for call in calls
        ],
        "resolvedInterrupts": resolved_interrupts,
        "resumeEvents": events,
        "observedExecutions": executed,
        "eventTypes": [event.get("type") for event in events],
        "toolResultEvents": [
            event for event in events
            if str(event.get("type", "")).upper() in {"TOOL_CALL_RESULT", "TOOLCALLRESULTEVENT"}
        ],
    }


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--revision", required=True, choices=["affected", "fixed"])
    parser.add_argument("--out-dir", required=True)
    args = parser.parse_args()
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    scenarios = [
        (
            "two-accepted",
            [
                {"id": "c1", "name": "deploy_change", "arguments": {"target": "a"}},
                {"id": "c2", "name": "deploy_other", "arguments": {"target": "b"}},
            ],
            {"c1": True, "c2": True},
        ),
        (
            "accepted-and-rejected",
            [
                {"id": "r1", "name": "update_record", "arguments": {"target": "approved"}},
                {"id": "r2", "name": "delete_record", "arguments": {"target": "denied"}},
            ],
            {"r1": True, "r2": False},
        ),
        (
            "single-accepted",
            [{"id": "s1", "name": "publish_record", "arguments": {"target": "single"}}],
            {"s1": True},
        ),
    ]

    summary: dict[str, Any] = {
        "frameworkRevisionLabel": args.revision,
        "scenarios": {},
        "environment": {
            "frameworkSource": "microsoft/agent-framework",
            "apiCalls": False,
            "externalSideEffects": False,
        },
    }
    for case_id, calls, decisions in scenarios:
        result = await run_scenario(case_id, calls, decisions)
        result["revisionLabel"] = args.revision
        path = out_dir / f"{case_id}.json"
        path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        summary["scenarios"][case_id] = {
            "capture": str(path),
            "initialCalls": len(result["initialToolCalls"]),
            "acceptedApprovals": sum(item["payload"]["accepted"] for item in result["resolvedInterrupts"]),
            "rejectedApprovals": sum(not item["payload"]["accepted"] for item in result["resolvedInterrupts"]),
            "observedExecutions": result["observedExecutions"],
            "eventTypes": result["eventTypes"],
            "toolResultCount": len(result["toolResultEvents"]),
        }

    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
