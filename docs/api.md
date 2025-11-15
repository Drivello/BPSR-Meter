# API

- Header de autenticación obligatorio si `BPSR_REQUIRE_TOKEN=true`:
  - `x-bpsr-token: <TOKEN>`
- CORS: restringido a orígenes permitidos.
- Rate-limit: por IP, ventana configurable.

## REST
- `GET /api/data`
- `GET /api/enemies`
- `GET /api/skill/:uid`
- `POST /api/clear` (limpia estadísticas en memoria)
- `POST /api/clear-logs` (purga `DATA_DIR/logs/*` y `logs_dps.json`)
- `GET /api/settings`
- `POST /api/settings`
- `GET /api/pause`
- `POST /api/pause` body: `{ "paused": true|false }`
- `GET /api/history/list`
- `GET /api/history/:timestamp/summary`
- `GET /api/history/:timestamp/data`
- `GET /api/history/:timestamp/skill/:uid`
- `GET /api/history/:timestamp/download`
- `GET /api/diccionario`
- `GET /api/logs-dps`
- `POST /api/logs-dps`

Ejemplo:
```bash
curl -H "x-bpsr-token: $TOKEN" http://127.0.0.1:8989/api/data
```

## WebSocket (Socket.io)
- Handshake debe incluir token:
  - En `auth.token` o header `x-bpsr-token`.
- Eventos:
  - `data` (emisión periódica con `{ code, user }`).
