"""
planner — turns everything the desk knows into a schedule that covers every minute.

  settings.py  the knobs (pools + weights, workday, meals, sleep fallback), JSON on disk
  model.py     Block and Task
  sources.py   gathers inputs: mail extractions, Google Calendar busy time, todos,
               projects/jobs (pool content), Garmin sleep window
  solver.py    pure function: inputs -> blocks (EDF for deadlines, water-filling for pools)
  gcal.py      mirrors the plan into a dedicated "Agent Smith" Google Calendar
  service.py   re-plans on change / every 15 min, holds pins + done marks, SSE version
"""
