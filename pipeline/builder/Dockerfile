FROM python:3.12-slim

# osmium-tool und Basiswerkzeuge installieren
RUN apt-get update && apt-get install -y --no-install-recommends \
    osmium-tool \
    tippecanoe \
    curl \
    ca-certificates \
    jq \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python-Abhängigkeiten
RUN pip install --no-cache-dir requests

COPY build_features.py /app/build_features.py
RUN chmod +x /app/build_features.py

ENTRYPOINT ["python", "/app/build_features.py"]
