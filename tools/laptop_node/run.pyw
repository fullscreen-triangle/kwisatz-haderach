"""Logon-task launcher for the laptop node (pythonw: no console). Logs to <state>/laptop-node.log."""

import sys
import traceback
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from tools.laptop_node import config  # noqa: E402

log = open(config.state_dir() / "laptop-node.log", "a", encoding="utf-8", buffering=1)
sys.stdout = sys.stderr = log
try:
    from tools.laptop_node.__main__ import main
    main(["serve"])
except BaseException:
    traceback.print_exc()
    raise
