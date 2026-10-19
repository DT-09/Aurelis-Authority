"""End-to-end deterministic reproduction of Microsoft Agent Framework issue #7569.

Runs the real upstream Agent + AgentFrameworkAgent with a scripted local chat client.
The first model response emits a batch of approval-gated tool calls; the second turn
resumes both decisions. Tools only append to an in-memory list.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from agent_framework import Agent, ChatResponseUpdate, Content, FunctionTool
from agent_framework_ag_ui._agent import AgentFrameworkAgent
from conftest import StreamingChatClientStub


def event_to_dict(event: Any) -> dict[str, Any]:
    if hasattr(event, "model_dump"):
        return event.model_dump(mode="json", by_alias=True, exclude_none=True)
    if hasattr(event, "dict"):
        return event.dict(by_alias=True, exclude_none=True)
    if isinstance(event, dict):
        return event
    return {"type": getattr(event, "type", type(event).__name__), "repr": repr(event)}


def collect_interrupt_ids(events: list[dict[str, Any]]) -> list[str]:
    ids: list[str] = []
    for event in events:
        outcome = event.get("outcome")
        if not isinstance(outcome, dict):
            continue
        interrupts = outcome.get("interrupts", [])
        if not isinstance(interrupts, list):
            continue
        for interrupt in interrupts:
            if isinstance(interrupt, dict):
                value = interrupt.get("id") or interrupt.get("interruptId")
                if isinstance(value, str):
                    ids.append(value)
    return ids


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

    initial_tool_call_batch = [
        Content.from_function_call(
            call_id=call["id"],
            name=call["name"],
            arguments=call["arguments"],
        )
        for call in calls
    ]
    model_turn = 0

    async def scripted_stream(messages, options, **kwargs):
        nonlocal model_turn
        model_turn += 1
        if model_turn == 1:
            yield ChatResponseUpdate(contents=initial_tool_call_batch, role="assistant")
        else:
            yield ChatResponseUpdate(contents=[Content.from_text(text="Resume completed.")], role="assistant")

    client = StreamingChatClientStub(stream_fn=scripted_stream)
    agent = Agent(client=client, name=f"aurelis-{case_id}", tools=tools)
    agui_agent = AgentFrameworkAgent(agent, require_confirmation=False)
    thread_id = f"aurelis-{case_id}"

    initial_events: list[dict[str, Any]] = []
    async for event in agui_agent.run({
        "thread_id": thread_id,
        "run_id": f"{case_id}-initial",
        "messages": [{"role": "user", "content": f"Run scenario {case_id}"}],
    }):
        initial_events.append(event_to_dict(event))

    resolved_interrupts = [
        {
            "interruptId": call["id"],
            "status": "resolved",
            "payload": {"accepted": decisions[call["id"]]},
        }
        for call in calls
    ]
    resume_events: list[dict[str, Any]] = []
    async for event in agui_agent.run({
        "thread_id": thread_id,
        "run_id": f"{case_id}-resume",
        "messages": [],
        "resume": resolved_interrupts,
    }):
        resume_events.append(event_to_dict(event))

    result = {
        "caseId": case_id,
        "initialToolCalls": [
            {"id": call["id"], "name": call["name"], "arguments": call["arguments"]}
            for call in calls
        ],
        "initialEvents": initial_events,
        "initialInterruptIds": collect_interrupt_ids(initial_events),
        "resolvedInterrupts": resolved_interrupts,
        "resumeEvents": resume_events,
        "observedExecutions": executed,
        "initialEventTypes": [event.get("type") for event in initial_events],
        "resumeEventTypes": [event.get("type") for event in resume_events],
        "toolResultEvents": [
            event for event in resume_events
            if str(event.get("type", "")).upper() in {"TOOL_CALL_RESULT", "TOOLCALLRESULTEVENT"}
        ],
        "modelTurns": model_turn,
    }
    return result


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
            "entrypoint": "Agent + AgentFrameworkAgent",
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
            "initialInterruptIds": result["initialInterruptIds"],
            "acceptedApprovals": sum(item["payload"]["accepted"] for item in result["resolvedInterrupts"]),
            "rejectedApprovals": sum(not item["payload"]["accepted"] for item in result["resolvedInterrupts"]),
            "observedExecutions": result["observedExecutions"],
            "initialEventTypes": result["initialEventTypes"],
            "resumeEventTypes": result["resumeEventTypes"],
            "toolResultCount": len(result["toolResultEvents"]),
            "modelTurns": result["modelTurns"],
        }

    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
