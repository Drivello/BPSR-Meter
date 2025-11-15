# Arquitectura

- **Electron (main)**: `electron-main.js`
  - Lanza `server.js` en puerto libre local.
  - Endurece `BrowserWindow`.
  - Inyecta token de sesión vía querystring a `index.html`.

- **Renderer (UI)**: `public/index.html`, `public/js/main.js`, `public/css/style.css`
  - UI 100% offline (sin CDNs).
  - Envío de `x-bpsr-token` en todas las llamadas `/api/*`.

- **Servidor (Node)**: `server.js`
  - Carga `.env` y `settings.json` (en `DATA_DIR`).
  - Configura seguridad (host, CORS, token, rate-limit, Socket.io auth).

- **API**: `src/server/api.js`
  - Rutas `/api/*` protegidas.
  - Limpieza de logs confinada a `DATA_DIR/logs`.

- **Sniffer**: `src/server/sniffer.js`
  - Usa `cap`. No auto-instala Npcap.
  - Verifica Npcap y falla de forma segura.

- **Procesamiento**: `algo/packet.js`
  - Decodifica mensajes. Volcados binarios sólo con `BPSR_DEBUG=1` a `DATA_DIR/debug`.

- **Datos/Paths**: `src/server/dataManager.js`, `src/server/paths.js`
  - `paths.js` implementa `DATA_DIR`, `safeJoin()`, `getLogsDir()`, `getDebugDir()`.

- **Puertos**: `src/utils/port.js`
  - Búsqueda de puerto libre en `127.0.0.1`.

Diagramas PlantUML: ver `docs/puml/*.puml`.
