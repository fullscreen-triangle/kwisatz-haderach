"""
tasks — give the desk a job in plain words; an agent does it with tools.

"Find the forms Mandy Sadewasser sent me and fill them in" becomes a run of tool calls by
a model that can call tools (function calling): search the mail, read a message and its
links, open a link, download a PDF, make a form of it, add the mails that hold your details
as its sources, fill it. Every call and what it found is kept and drawn as a graph.

The agent never writes a value into a form itself. `fill_form` hands the form to
backend/forms, where a value is written only when quotes found verbatim in the sources —
or your own answer — give it the margin (backend/memory). So the agent finds and gathers;
the evidence decides; you settle the rest on /desk/forms.

The agent runs on a cloud model (it must call tools reliably, which the node's 7B model does
not): the mails and documents it reads are sent to that model's provider. The task shows
which model it ran on.

  web.py      opening links safely: public addresses only, PDFs saved, pages read
  tools.py    the tools, their JSON schemas, and what each adds to the graph
  agent.py    the tool-calling loop
  service.py  tasks on the node: store, background runs, change notification
"""
