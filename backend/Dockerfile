FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (cached layer unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .

# Railway injects $PORT at runtime; default to 8000 for local Docker use
ENV PORT=8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
