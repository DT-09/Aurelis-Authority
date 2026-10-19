"""Run the minimal AG-UI #7569 resume reproduction against upstream source.

This calls the actual upstream run_agent_stream implementation with deterministic local
FunctionTools. The input contains the original assistant tool-call batch and both approval
responses, matching the upstream issue's minimal reproducer. No hosted model or external
side effects are used.
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

        def make_executor(bound_call_id: str, bound_tool_name: str):
            def execute(target: str) -> str:
                executed.append({"callId": bound_call_id, "tool": bound_tool_name, "target": target})
                return f"{bound_tool_name} completed {target}"
            return execute

        tools.append(
            FunctionTool(
                name=tool_name,
                description=f"Deterministic local test tool {tool_name}",
                func=make_executor(call_id, tool_name),
                approval_mode="always_require",
            )
        )

    initial_tool_call_batch = {
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
    }
    resolved_interrupts = [
        {
            "interruptId": call["id"],
            "status": "resolved",
            "payload": {"accepted": decisions[call["id"]]},
        }
        for call in calls
    ]
    approval_messages = [
        {
            "role": "tool",
            "content": json.dumps({"accepted": decisions[call["id"]]}),
            "toolCallId": call["id"],
        }
        for call in calls
    ]
    # This mirrors the upstream issue's minimal reproducer: original assistant
    # tool-call batch followed by one explicit approval response per call.
    resume_messages: list[dict[str, Any]] = [
        {"role": "user", "content": f"Run scenario {case_id}"},
        initial_tool_call_batch,
        *approval_messages,
    ]

    agent = StubAgent(
        updates=[AgentResponseUpdate(contents=[Content.from_text(text="Resume completed.")], role="assistant")],
        default_options={"tools": tools},
    )
    events: list[dict[str, Any]] = []
    async for event in run_agent_stream(
        {
            "thread_id": f"aurelis-{case_id}",
            "run_id": f"{case_id}-resume",
            "messages": resume_messages,
        },
        agent,
        AgentConfig(require_confirmation=False),
    ):
        events.append(event_to_dict(event))

    return {
        "caseId": case_id,
        "initialToolCalls": [
            {"id": call["id"], "name": call["name"], "arguments": call["arguments"]}
            for call in calls
        ],
        "initialToolCallBatch": initial_tool_call_batch,
        "resolvedInterrupts": resolved_interrupts,
        "approvalMessages": approval_messages,
        "resumeMessages": resume_messages,
        "resumeEvents": events,
        "observedExecutions": executed,
        "resumeEventTypes": [event.get("type") for event in events],
        "toolResultEvents": [
            event for event in events
            if str(event.get("type", "")).upper() in {"TOOL_CALL_RESULT", "TOOLCALLRESULTEVENT"}
        ],
    }


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--revision", required=True, choices=["affected", "fixed"])
    parser.add_argument("--source-commit", required=True)
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
        "sourceCommit": args.source_commit,
        "scenarios": {},
        "environment": {
            "frameworkSource": "microsoft/agent-framework",
            "apiCalls": False,
            "externalSideEffects": False,
            "entrypoint": "agent_framework_ag_ui._agent_run.run_agent_stream",
        },
    }
    for case_id, calls, decisions in scenarios:
        result = await run_scenario(case_id, calls, decisions)
        result["revisionLabel"] = args.revision
        result["sourceCommit"] = args.source_commit
        path = out_dir / f"{case_id}.json"
        path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        summary["scenarios"][case_id] = {
            "capture": str(path),
            "initialCalls": len(result["initialToolCalls"]),
            "approvalResponses": len(result["resolvedInterrupts"]),
            "acceptedApprovals": sum(item["payload"]["accepted"] for item in result["resolvedInterrupts"]),
            "rejectedApprovals": sum(not item["payload"]["accepted"] for item in result["resolvedInterrupts"]),
            "observedExecutions": result["observedExecutions"],
            "resumeEventTypes": result["resumeEventTypes"],
            "toolResultCount": len(result["toolResultEvents"]),
        }

    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
