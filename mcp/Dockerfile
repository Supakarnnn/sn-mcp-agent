FROM python:3.13-slim

WORKDIR /mcp

COPY requirements.txt .

RUN pip install --default-timeout=2000 --no-cache-dir -r requirements.txt

COPY mcp_server.py .

EXPOSE 8080

CMD [ "fastmcp","run","mcp_server.py:mcp","--transport","streamable-http","--port","8080","--host","0.0.0.0" ]

#fastmcp run mcp_server.py:mcp --transport streamable-http --port 8080 --host 0.0.0.0