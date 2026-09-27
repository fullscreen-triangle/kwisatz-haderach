"""
agents — a command becomes a run: decomposed into subtasks, each resolved by an agent
calling one tool, then synthesised into an answer. Every step is an event and a node in
the run's graph, which the console draws live.

  llm.py     the two brains: local Ollama first, Claude (escalation) when the local plan
             fails or the command says `deep:`
  tools.py   what agents can do — read/search mail, attachments, RAG, memory, the plan,
             notes, drafts, repos — each a small async function with a described signature
  notes.py   notes and reply drafts the agents write (markdown on disk, searchable)
  runner.py  plan -> dependency-ordered agents -> synthesis, as events + graph
  service.py the run store, the live version for SSE, and the daily "what moved" digest
"""
