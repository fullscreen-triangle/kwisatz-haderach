"""
forms — filling in documents, decided by the working memory (backend/memory).

Every field of a form is a node. Candidates come from a model reading the documents you
attached (a proposal: the `virtual` graph), from your published facts, and from you. What
moves a field's margin is only:

  * a QUOTE the model gave, found verbatim in the named source and containing the value —
    one witness per field per source (a document repeated is not a second witness);
  * YOUR answer (confirm, type, or "leave blank" = ⊥).

A field is written into the PDF only when it is solved. Everything else is listed as
needing you, with the leader, the runner-up and the quotes behind them. Answers you mark
"remember" become facts about you (record "me") in a memory shared by every form, and
those published facts are offered to the next form as one more source.

Documents are read by the node's own model unless the form allows cloud models: the text
of your documents then leaves the server.

  pdf.py      AcroForm fields, and writing values into them
  service.py  forms on the node: sources, reading, answers, the filled PDF or value sheet
"""
