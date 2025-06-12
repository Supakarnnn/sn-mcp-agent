FROM python:3.13-slim

WORKDIR /api

COPY requirements.txt .

RUN pip install --default-timeout=2000 --no-cache-dir -r requirements.txt

COPY agent ./agent
COPY model ./model
COPY prompt ./prompt

COPY client.py .

EXPOSE 8001

CMD ["uvicorn", "client:app", "--host", "0.0.0.0", "--port", "8001"]

