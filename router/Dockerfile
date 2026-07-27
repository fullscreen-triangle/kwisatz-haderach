FROM python:3.11-slim

WORKDIR /app

# Build context is the router/ directory itself (deployed via `railway up`
# from inside router/), so paths here are relative to router/, not repo root.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py ./

EXPOSE 8000

# Railway injects $PORT at runtime; bind to it (fall back to 8000 locally).
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
