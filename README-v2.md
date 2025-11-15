# BPSR-Meter v2 (Endurecimiento y Uso Local Seguro)

Esta versión endurecida de BPSR-Meter (Electron + Node.js) prioriza el uso local en Windows 10/11 con superficies de ataque reducidas, configuración mediante variables de entorno y pruebas de seguridad automatizadas.

---

## Objetivos de seguridad
- **Sólo local por defecto:** Servidor en `127.0.0.1`. Acceso LAN es opt-in.
- **Autenticación por token:** Todas las rutas `GET/POST /api/*` y Socket.io requieren token.
- **CORS estricto:** Orígenes permitidos sólo los configurados.
- **Rate limiting:** Límite configurable por ventana.
- **FS confinado:** Datos, logs y debug dentro de `DATA_DIR` con `safeJoin()`.
- **Electron endurecido:** `contextIsolation`, `sandbox`, `webSecurity` activados.
- **Sin ejecuciones peligrosas:** Sin instaladores ni `taskkill`/`netstat` automáticos.
- **Activos offline:** Sin dependencias CDN.

---

## Requisitos
- Windows 10/11 x64
- Npcap instalado manualmente (https://nmap.org/npcap/)
- Node.js 20.x 
- Python 3.11

---

## Instalación y ejecución
1. Instala Npcap manualmente. (https://nmap.org/npcap/)
2. Instala dependencias: 
   - `pnpm install` 
3. Crea un archivo `.env` (local, no versionado) usando como referencia `.env.example`.
4. Ejecuta en desarrollo: `pnpm start`

Durante el arranque, Electron:
- Selecciona un puerto disponible (base 8989 en `127.0.0.1`).
- Genera un token de sesión y lo pasa al servidor vía `env`.
- Abre `public/index.html` con `?token=<TOKEN>` para que el front lo use en cada petición.

---

## Variables de entorno (.env)
- `BPSR_HOST`: Host de escucha. Por defecto `127.0.0.1` (si `BPSR_ENABLE_LAN=false`).
- `BPSR_PORT`: Puerto (por defecto `8989`).
- `BPSR_ENABLE_LAN`: `true/false`. Si `true`, el host será `0.0.0.0` y el token es obligatorio.
- `BPSR_REQUIRE_TOKEN`: `true/false`. Recomendado `true` (obligatorio en LAN).
- `BPSR_API_TOKEN`: Token de API. Si falta y es requerido, el servidor genera uno al iniciar.
- `BPSR_ALLOWED_ORIGINS`: Coma-separado. Ej.: `http://127.0.0.1:8989,http://localhost:8989`.
- `BPSR_DATA_DIR`: Directorio raíz de datos. Por defecto `<userData>/bpsr`.
- `BPSR_HISTORY_SAVE`: `true/false` para guardar historiales en `DATA_DIR/logs/<timestamp>`.
- `BPSR_FIGHT_LOG`: `true/false` para habilitar `fight.log` por encuentro.
- `BPSR_LOG_RETENTION_DAYS`: Días para purga de históricos (sólo si > 0).
- `BPSR_RATE_WINDOW_MS`: Ventana en ms del rate limit de `/api/*`.
- `BPSR_RATE_MAX`: Máximas peticiones por ventana e IP en `/api/*`.
- `BPSR_DEBUG`: `1/true` para habilitar volcados de debug en `DATA_DIR/debug` (rotación: 10 archivos).

Notas:
- En LAN, si no se define `BPSR_ALLOWED_ORIGINS`, CORS permite por defecto sólo orígenes locales.
- El token se envía en el header `x-bpsr-token`.

---

## Directorio de datos (DATA_DIR)
Por defecto, `DATA_DIR` es `<app.getPath('userData')>/bpsr`.

Estructura:
- `settings.json`: Preferencias de app.
- `logs/`: Historial por timestamp (si `BPSR_HISTORY_SAVE=true`).
- `debug/`: Archivos de depuración (si `BPSR_DEBUG=1`).

Todas las rutas internas usan `safeJoin()` para prevenir path traversal.

---

## Red endurecida (HTTP/WS)
- Servidor Express + Socket.io restringidos a orígenes permitidos.
- Todas las rutas `/api/*` requieren token en `x-bpsr-token` si `BPSR_REQUIRE_TOKEN=true`.
- Rate limiting básico en memoria por IP.
- Socket.io valida el token en handshake (headers o `auth.token`).

---

## Seguridad en Electron
- `webPreferences`:
  - `contextIsolation: true`
  - `sandbox: true`
  - `nodeIntegration: false`
  - `webSecurity: true`
  - `allowRunningInsecureContent: false`
  - `enableRemoteModule: false`
- `preload.js`: expone una API mínima con `contextBridge`.

---

## UI sin CDNs
- `public/index.html` no incluye Google Fonts ni Font Awesome.
- Iconografía reemplazada por caracteres Unicode y CSS local.

---

## Pruebas de seguridad
- Ejecuta: `pnpm test` (o `npm test`).
- Usa `BPSR_SKIP_SNIFFER=1` para saltar captura en pruebas.
- Cobertura mínima:
  - Token requerido en `/api/*`.
  - CORS estricto.
  - Rate limiting activo.
  - `safeJoin()` bloquea traversal.

---

## Empaquetado Windows (NSIS)
- Instalación por usuario (sin privilegios de administrador):
  - `perMachine: false`
  - `allowElevation: false`
- Opción para eliminar datos de usuario en desinstalación ya existente.

---

## Advertencias y buenas prácticas
- Mantén el token en secreto. No compartas capturas con la URL que incluya `?token=`.
- Evita exponer el servidor a LAN sin revisar `BPSR_ALLOWED_ORIGINS` y `BPSR_REQUIRE_TOKEN=true`.
- No ejecutes instaladores externos ni scripts de sistema desde la app.

---

## Solución de problemas
- Revisa `iniciar_log.txt` en el directorio de datos de Electron.
- Verifica Npcap instalado correctamente.
- Si no hay datos: inicia el juego antes que el medidor; revisa firewall/antivirus.

---

## Licencia
AGPL-3.0. Créditos al proyecto original y contribuidores (ver `AUTHORS.md`).
