"""
primitive — a task becomes a small trie of agents, each routed to the model that suits it.

Ported from the Rust harness `primitive` (git.uni-greifswald.de/sachikonyk/primitive) so the
desk depends on nothing outside this repository. The mechanism is unchanged:

  * every node holds one instruction and either REALISES it or SPLITS it into
    know (k) / do (t) / check (e);
  * a split node takes its `do` value only if its `check` holds; a failed check forecloses
    that split at the node, and after `max_attempts` the node DECLINES, listing what it tried;
  * each node goes to a model chosen by what its instruction asks for (code, reasoning,
    general, verify); a check never goes to the family that produced the work, and with
    `crowd > 1` it holds only if checkers of several families all agree;
  * everything except the model calls is deterministic code, tested without a model.

What differs here, because the desk holds keys for several providers instead of one endpoint:

  * models are named `<provider>/<model>` (openai, gemini, anthropic, hf, ollama) and one pool
    spans all of them; a refused ACCOUNT (401/402/403) switches off that provider only;
  * a provider the keeper reports as rejected or missing is left out before any call;
  * there is no Copilot executor, so nothing is run: the best grade is `corroborated`.

  trie.py      — addresses, the append-only record and foreclosures
  proposal.py  — what an agent is told, and reading what it answers
  route.py     — specialties, families, the pool, the routed proposer
  providers.py — the five chat APIs, their catalogs, keeper gating
  engine.py    — growing, closing, retrying and declining the trie
  service.py   — tasks on the node: store, background runs, change notification
"""
