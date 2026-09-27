"""
Project Manager tracker — Kundai's own project manager: tracks work and plans
toward the goal, and reports.

Same shape as tools/document_tracker and tools/jobcenter_tracker: a JSON
store on disk, mutated by explicit calls, no auto-probing of the tracked
work itself. That matters here specifically because the tracked sub-tools
(model-gen/acquisition, RAG, Wind Tunnel, Bloodhound) are separate repos run
remotely via Codespaces — this module cannot see into them. Status is
whatever was last logged, not what is currently true; report accordingly.

A project's milestones are grouped by "layer" rather than a flat list,
because the first tracked project (the Greifswald group LLM) is a concrete
instance of two papers with their own layer vocabulary:
  - Accountable Compilation (research-domain-specific-models.tex):
    acquisition / composition / verification
  - Federated Retrieval-Augmentation (federated-retrieval-augmentation.tex):
    rag (federated contact graph, triangle-grounding, closure)
Reports group and phrase status in that vocabulary so they read the same way
as every other project write-up in this portfolio. A future project that
doesn't use these layers can just use its own layer names, or a single
generic layer — nothing here is hardcoded to these four values beyond the
seed data.

No LLM call anywhere in this module: every phrased summary is built by
string formatting over counts computed from the stored JSON, never
generated. If Ollama is down, `project_report` still works.
"""

import json
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Optional

ROOT = Path(__file__).parent.parent.parent
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
STORE_FILE = DATA_DIR / "projects.json"

STATUSES = ("todo", "in_progress", "done", "blocked")


class NotFound(Exception):
    pass


# ------------------------------------------------------------------- store

def _load() -> Dict[str, Any]:
    if not STORE_FILE.exists():
        return {"projects": []}
    return json.loads(STORE_FILE.read_text(encoding="utf-8"))


def _save(data: Dict[str, Any]) -> None:
    STORE_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def _find_project(data: Dict[str, Any], project_id: str) -> Dict[str, Any]:
    for p in data["projects"]:
        if p["id"] == project_id:
            return p
    raise NotFound(f"No project '{project_id}'.")


def _find_item(items: List[Dict[str, Any]], item_id: str, kind: str) -> Dict[str, Any]:
    for it in items:
        if it["id"] == item_id:
            return it
    raise NotFound(f"No {kind} '{item_id}'.")


# ------------------------------------------------------------------ reads

def list_projects() -> List[Dict[str, Any]]:
    return _load()["projects"]


def get_project(project_id: str) -> Dict[str, Any]:
    return _find_project(_load(), project_id)


def project_report(project_id: str) -> Dict[str, Any]:
    """Compute per-layer milestone counts, an overall percentage, and a
    plain-language summary — purely from stored data, never invented."""
    project = get_project(project_id)

    by_layer: Dict[str, Dict[str, int]] = {}
    for m in project["milestones"]:
        layer = m.get("layer", "general")
        by_layer.setdefault(layer, {"done": 0, "in_progress": 0, "blocked": 0, "todo": 0, "total": 0})
        by_layer[layer][m["status"]] += 1
        by_layer[layer]["total"] += 1

    total = len(project["milestones"])
    done = sum(1 for m in project["milestones"] if m["status"] == "done")
    blocked = [m for m in project["milestones"] if m["status"] == "blocked"]
    pct = round(100 * done / total) if total else 0

    layer_lines = []
    for layer, counts in by_layer.items():
        layer_lines.append(f"{layer}: {counts['done']}/{counts['total']} done")
    summary = f"{project['name']} — {pct}% ({done}/{total} milestones done). " + "; ".join(layer_lines) + "."
    if blocked:
        summary += " Blocked: " + ", ".join(m["title"] for m in blocked) + "."

    subtool_lines = [f"{s['name']} ({s['status']})" for s in project["subtools"]]

    return {
        "id": project["id"],
        "name": project["name"],
        "percent_done": pct,
        "milestones_done": done,
        "milestones_total": total,
        "by_layer": by_layer,
        "blocked": [m["title"] for m in blocked],
        "subtools": subtool_lines,
        "last_log": project["log"][-1] if project["log"] else None,
        "summary": summary,
    }


def most_recent_project_id() -> Optional[str]:
    """The project whose log was most recently touched, or the sole project,
    or None if the store is empty. Used by the intent routine when no
    project is named in the utterance."""
    projects = list_projects()
    if not projects:
        return None
    if len(projects) == 1:
        return projects[0]["id"]
    dated = [(p["log"][-1]["date"], p["id"]) for p in projects if p["log"]]
    if not dated:
        return projects[0]["id"]
    dated.sort(reverse=True)
    return dated[0][1]


# ----------------------------------------------------------------- writes

def add_log_entry(project_id: str, text: str) -> Dict[str, Any]:
    data = _load()
    project = _find_project(data, project_id)
    entry = {"date": date.today().isoformat(), "entry": text}
    project["log"].append(entry)
    _save(data)
    return entry


def set_milestone_status(project_id: str, milestone_id: str, status: str,
                          notes: Optional[str] = None) -> Dict[str, Any]:
    if status not in STATUSES:
        raise ValueError(f"status must be one of {STATUSES}")
    data = _load()
    project = _find_project(data, project_id)
    milestone = _find_item(project["milestones"], milestone_id, "milestone")
    milestone["status"] = status
    if notes is not None:
        milestone["notes"] = notes
    _save(data)
    return milestone


def set_subtool_status(project_id: str, subtool_id: str, status: str) -> Dict[str, Any]:
    if status not in STATUSES + ("available",):
        raise ValueError(f"status must be one of {STATUSES + ('available',)}")
    data = _load()
    project = _find_project(data, project_id)
    subtool = _find_item(project["subtools"], subtool_id, "subtool")
    subtool["status"] = status
    _save(data)
    return subtool


if __name__ == "__main__":
    # smoke test
    rep = project_report("greifswald-group-llm")
    print(json.dumps(rep, indent=2))
