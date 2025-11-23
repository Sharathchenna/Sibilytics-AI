FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY data_viz.py .

EXPOSE 8000

# Uvicorn with production-optimized settings for large file uploads
CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "4", \
     "--timeout-keep-alive", "75", \
     "--limit-concurrency", "1000", \
     "--limit-max-requests", "10000", \
     "--backlog", "2048"]

