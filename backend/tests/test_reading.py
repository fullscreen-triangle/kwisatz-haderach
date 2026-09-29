"""
Reading tasks end to end on two throwaway git repos, with the real okgg binary and its
deterministic lexical proposer (no model). Skipped where okgg or git is not installed.
Run: python -m pytest backend/tests/test_reading.py
"""

import re
import shutil
import subprocess

import pytest

from backend.reading import locate

pytestmark = pytest.mark.skipif(not shutil.which("git"), reason="git not installed")

DOC = """# Parser guide

The parser reads HPLC chromatogram files and emits spectra records.

## Binary layout

Every Hitachi file starts with a header block. The header block stores the detector
wavelength and the sampling interval.

```
## not a heading inside a fence
```

## Peak integration

Peaks are integrated with the trapezoid rule; baselines are fitted before integration.

## Peak integration

A second section with the same heading gets the slug suffix -2 in okgg.
"""

TEX = r"""\documentclass{article}
\begin{document}
\section{Ontology alignment}
Alignment of catalysis ontologies with SciDatS terms and the EnzymeML schema.
\section{Converter \emph{design}}
The converter maps instrument exports to SciDatS containers.
\end{document}
"""

CODE = '''"""Water-filling allocation of attention across scenes."""

def waterfill(pools, free):
    """Single shadow price over concave returns."""
    return pools
'''


def test_slugify_and_sections_follow_okgg_rules():
    assert locate.slugify("Converter  design!") == "converter-design"
    spans = locate.sections("guide.md", DOC)
    assert [s.key for s in spans] == ["guide.md#parser-guide", "guide.md#binary-layout",
                                     "guide.md#peak-integration", "guide.md#peak-integration-2"]
    lines = DOC.splitlines()
    b = spans[1]
    assert lines[b.start - 1] == "## Binary layout" and "not a heading" in "\n".join(lines[b.start - 1:b.end])
    tex = locate.sections("paper.tex", TEX)
    assert [s.key for s in tex] == ["paper.tex#ontology-alignment", "paper.tex#converter-design"]
    assert locate.sections("alloc.py", CODE)[0].key == "alloc.py"


def test_cue_line_matches_normalised_words_across_lines():
    lines = DOC.splitlines()
    sp = locate.sections("guide.md", DOC)[1]
    n = locate.cue_line(lines, sp.start, sp.end, "header blocks")          # plural-reduced
    assert n is not None and "header block" in lines[n - 1]
    assert locate.cue_line(lines, sp.start, sp.end, "trapezoid") is None   # not in this section
    assert locate.words("HTTPServer parses Ontologies") == ["http", "server", "parse", "ontology"]


@pytest.fixture
def repos(tmp_path, monkeypatch):
    monkeypatch.setenv("AGENT_SMITH_STATE", str(tmp_path / "state"))
    monkeypatch.setenv("REPOS_DIR", str(tmp_path / "clones"))

    def git(cwd, *a):
        subprocess.run(["git", *a], cwd=cwd, check=True, capture_output=True)

    for name, files in {"hplc-reader": {"guide.md": DOC, "alloc.py": CODE}, "semantics": {"paper.tex": TEX}}.items():
        d = tmp_path / "clones" / name
        d.mkdir(parents=True)
        for f, text in files.items():
            (d / f).write_text(text, encoding="utf-8")
        git(d, "init", "-q")
        git(d, "-c", "user.email=t@t", "-c", "user.name=t", "add", ".")
        git(d, "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "init")
    return tmp_path


@pytest.mark.skipif(not shutil.which("okgg"), reason="okgg not installed")
def test_task_graph_references_and_progress(repos, monkeypatch):
    from backend.reading import index, runner, store
    monkeypatch.setattr(runner, "ensure_tracked", lambda names: [])     # no GitHub in tests
    t = store.create("NFDI reading", ["hplc-reader", "semantics"], theta=0.9, budget=6)
    run = runner.run(t["id"], generator="lexical")
    assert run["state"] == "done", run
    # our section port agrees with okgg's own keys, and every key carries its repo
    ix = index.index(t["id"])
    assert set(ix.keys) == {"hplc-reader/guide.md#parser-guide", "hplc-reader/guide.md#binary-layout",
                            "hplc-reader/guide.md#peak-integration", "hplc-reader/guide.md#peak-integration-2",
                            "hplc-reader/alloc.py", "semantics/paper.tex#ontology-alignment",
                            "semantics/paper.tex#converter-design"}
    # every witnessed cue is found on a line inside its section that contains its words
    located = 0
    for key in ix.keys:
        sv = index.section_view(t["id"], key)
        for c in sv["cues"]:
            assert c["line"] is not None, (key, c)
            s, e = sv["lines"]
            assert s <= c["line"] <= e
            located += 1
        assert sv["permalink"].startswith("https://github.com/") and f"#L{sv['lines'][0]}-L" in sv["permalink"]
    assert located > 0
    # tree + progress roll-up
    root = index.node_view(t["id"])
    assert root["node"]["size"] == 7 and root["node"]["read"] == 0
    store.mark(t["id"], "semantics/paper.tex#converter-design", True, runner.head_of("semantics"))
    store.mark(t["id"], "hplc-reader/alloc.py", True, runner.head_of("hplc-reader"))
    root = index.node_view(t["id"])
    assert root["node"]["read"] == 2 and root["summary"]["read"] == 2
    # changed since read: only the file that changed after it was read
    d = repos / "clones" / "semantics"
    (d / "paper.tex").write_text(TEX.replace("containers", "container files"), encoding="utf-8")
    subprocess.run(["git", "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qam", "edit"], cwd=d, check=True)
    changed = index.changed_since_read(t["id"], store.progress(t["id"]))
    assert changed == {"semantics/paper.tex#converter-design"}
    assert runner.stale(store.get(t["id"]))
    # ideas are okgg's concepts, with read shares
    ideas = ix.ideas(set(store.progress(t["id"])))
    assert ideas and all(0 <= i["read"] <= i["size"] for i in ideas)
    # the task list the phone opens with
    pytest.importorskip("fastapi")
    from backend.routes.reading import _with_progress
    row = _with_progress(store.get(t["id"]))
    assert (row["sections"], row["read"]) == (7, 2) and row["ideas"] == len(ideas)
