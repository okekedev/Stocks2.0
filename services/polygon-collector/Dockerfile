FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY polygon_collector.py .

RUN mkdir -p /app/data

ENV PYTHONUNBUFFERED=1
CMD ["python", "polygon_collector.py"]
