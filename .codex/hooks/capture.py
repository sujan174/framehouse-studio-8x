#!/usr/bin/env python3
"""Append only the user prompt and final assistant response from Codex hooks."""

import datetime as dt
import fcntl
import json
import os
from pathlib import Path
import re
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[2]
LOG_DIR = ROOT / ".agent-logs"
AUTHOR = "sujan174"


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def log_path(session_id: str, timestamp: str) -> Path:
    matches = list(LOG_DIR.glob(f"*_{session_id}.md"))
    if matches:
        return matches[0]
    stamp = dt.datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    return LOG_DIR / f"{stamp:%Y-%m-%d_%H-%M-%S}_{session_id}.md"


def header(session_id: str, timestamp: str, model: str) -> str:
    day = timestamp[:10]
    project = ROOT.name
    return (
        f"---\nsession_id: {session_id}\ndate: {day}\nauthor: {AUTHOR}\n"
        f"model: {model}\ntool: codex-desktop-cli\nproject: {project}\n"
        f"total_exchanges: 0\nfirst_prompt_time: {timestamp}\nlast_prompt_time: {timestamp}\n"
        f"---\n\n# Session Log - {day}\n\n"
        f"Session: `{session_id[:8]}` | Project: `{project}` | Author: `{AUTHOR}`\n\n---\n\n"
    )


def replace_header_value(contents: str, key: str, value: str) -> str:
    return re.sub(rf"(?m)^{re.escape(key)}: .*?$", f"{key}: {value}", contents, count=1)


def capture(event: dict) -> None:
    kind = event.get("hook_event_name")
    if kind not in {"UserPromptSubmit", "Stop"}:
        return
    session_id = event["session_id"]
    model = event.get("model") or "unknown"
    timestamp = utc_now()
    LOG_DIR.mkdir(exist_ok=True)
    lock_path = Path(tempfile.gettempdir()) / f"8x-capture-{session_id}.lock"
    with lock_path.open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        path = log_path(session_id, timestamp)
        if kind == "UserPromptSubmit":
            prompt = event.get("prompt")
            if not isinstance(prompt, str):
                return
            contents = path.read_text() if path.exists() else header(session_id, timestamp, model)
            number = len(re.findall(r"(?m)^\[LOG_ENTRY type=PROMPT ", contents)) + 1
            contents = replace_header_value(contents, "last_prompt_time", timestamp)
            contents += (
                f"[LOG_ENTRY type=PROMPT num={number} session={session_id[:8]}]\n"
                f"timestamp: {timestamp}\nmodel: {model}\n\n{prompt}\n\n"
            )
            path.write_text(contents)
        else:
            response = event.get("last_assistant_message")
            if not isinstance(response, str):
                return
            if not path.exists():
                return
            contents = path.read_text()
            prompt_count = len(re.findall(r"(?m)^\[LOG_ENTRY type=PROMPT ", contents))
            response_count = len(re.findall(r"(?m)^\[LOG_ENTRY type=RESPONSE ", contents))
            if prompt_count == 0 or response_count >= prompt_count:
                return
            contents += (
                f"[LOG_ENTRY type=RESPONSE num={prompt_count} session={session_id[:8]}]\n"
                f"timestamp: {timestamp}\nmodel: {model}\n\n{response}\n\n"
            )
            contents = replace_header_value(contents, "total_exchanges", str(prompt_count))
            path.write_text(contents)


if __name__ == "__main__":
    capture(json.load(sys.stdin))
