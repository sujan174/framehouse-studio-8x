#!/usr/bin/env python3
"""Bridge a desktop session that started before repo hooks were installed.

Reads only user messages and final answers from the saved Codex transcript.
The regular repo hooks remain the capture path for newly started sessions.
"""

import argparse
import json
from pathlib import Path
import time

from capture import capture


def messages(path: Path, since: str):
    with path.open() as stream:
        for line in stream:
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            if item.get("timestamp", "") < since or item.get("type") != "response_item":
                continue
            payload = item.get("payload", {})
            if payload.get("type") != "message":
                continue
            role = payload.get("role")
            phase = payload.get("phase")
            if role != "user" and not (role == "assistant" and phase == "final_answer"):
                continue
            content = "".join(
                part.get("text", "") for part in payload.get("content", [])
                if part.get("type") in {"input_text", "output_text"}
            )
            if role == "user" and (
                content.startswith("<external_codex_apps_open_page>")
                or content.startswith("<environment_context>")
            ):
                continue
            if content:
                yield role, content


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("transcript", type=Path)
    parser.add_argument("session_id")
    parser.add_argument("since")
    parser.add_argument("--model", default="gpt-6-sol")
    args = parser.parse_args()
    seen = 0
    while True:
        items = list(messages(args.transcript, args.since))
        for role, content in items[seen:]:
            capture({
                "hook_event_name": "UserPromptSubmit" if role == "user" else "Stop",
                "session_id": args.session_id,
                "model": args.model,
                "prompt": content,
                "last_assistant_message": content,
            })
        seen = len(items)
        time.sleep(0.5)


if __name__ == "__main__":
    main()
