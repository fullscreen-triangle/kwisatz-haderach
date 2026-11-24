"""Where the finance data lives, and how it is read and written.

The data is the user's own money and must never enter a repository, so it lives outside
the repo tree: ``$FINANCE_HOME`` if set, else ``~/.desk/finance``. Three JSON files:

    position.json      income, debts, money owed to the user, investments, settings
    transactions.json  imported bank rows, deduplicated by id
    deliveries.json    parcels by tracking number

Writes are atomic (temp file + rename), so a crash never leaves a half-written file.
Amounts are stored as decimal strings and read as ``Decimal``.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

EMPTY_POSITION: dict[str, Any] = {
    "version": 1,
    "currency": "EUR",
    "income": {"monthly_net": None, "fixed": []},
    "debts": [],
    "receivables": [],
    "investments": [],
    "settings": {"monthly_to_debt": None},
}


def home() -> Path:
    raw = os.getenv("FINANCE_HOME")
    return Path(raw).expanduser() if raw else Path.home() / ".desk" / "finance"


def money(value: Any) -> Decimal:
    """A decimal amount from a number or a string such as ``"1.234,56"`` or ``"-12.50"``."""
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (int, float)):
        return Decimal(str(value))
    text = str(value).strip().replace("€", "").replace("EUR", "").replace(" ", "").replace(" ", "")
    if not text:
        raise ValueError("empty amount")
    # German style: 1.234,56 -> 1234.56 ; plain 1234.56 stays
    if "," in text:
        text = text.replace(".", "").replace(",", ".")
    try:
        return Decimal(text)
    except InvalidOperation as exc:
        raise ValueError(f"not an amount: {value!r}") from exc


def fmt(value: Decimal) -> str:
    """Two-decimal string for JSON output."""
    return str(value.quantize(Decimal("0.01")))


def slug(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "item"


class Store:
    def __init__(self, directory: Path | None = None):
        self.dir = Path(directory) if directory else home()

    def _path(self, name: str) -> Path:
        return self.dir / name

    def _read(self, name: str, default: Any) -> Any:
        path = self._path(name)
        if not path.exists():
            return json.loads(json.dumps(default))
        with path.open(encoding="utf-8") as fh:
            return json.load(fh)

    def _write(self, name: str, data: Any) -> None:
        self.dir.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=self.dir, prefix=f".{name}.", suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                json.dump(data, fh, indent=2, ensure_ascii=False)
                fh.write("\n")
            os.replace(tmp, self._path(name))
        except BaseException:
            Path(tmp).unlink(missing_ok=True)
            raise

    def position(self) -> dict:
        data = self._read("position.json", EMPTY_POSITION)
        for key, value in EMPTY_POSITION.items():
            data.setdefault(key, json.loads(json.dumps(value)))
        return data

    def save_position(self, data: dict) -> None:
        self._write("position.json", data)

    def transactions(self) -> list[dict]:
        return self._read("transactions.json", [])

    def save_transactions(self, rows: list[dict]) -> None:
        self._write("transactions.json", rows)

    def deliveries(self) -> dict:
        return self._read("deliveries.json", {})

    def save_deliveries(self, data: dict) -> None:
        self._write("deliveries.json", data)
