# BPSR-Meter v2 (Uso local y endurecido)

Este documento es la guía principal de la versión endurecida para uso local. El objetivo es operar por defecto sólo en loopback (127.0.0.1), proteger la API con token, confinar el FS a DATA_DIR y empaquetar para Windows sin elevación.

- Lee también:
  - [arquitectura.md](./arquitectura.md)
  - [configuracion.md](./configuracion.md)
  - [api.md](./api.md)
  - [almacenamiento.md](./almacenamiento.md)
  - [electron-seguridad.md](./electron-seguridad.md)
  - [pruebas.md](./pruebas.md)
  - [empaquetado-windows.md](./empaquetado-windows.md)
  - [troubleshooting.md](./troubleshooting.md)
  - [modelo-amenazas.md](./modelo-amenazas.md)
  - [cambios-seguridad.md](./cambios-seguridad.md)

## Requisitos
- Windows 10/11 (x64)
- Node.js acorde a `package.json`
- Npcap instalado manualmente (https://nmap.org/npcap/)

## Configuración (.env)
Crea un `.env` a partir de [`.env.example`](../.env.example). Por defecto:
- `BPSR_HOST=127.0.0.1`
- `BPSR_PORT=0` (elige puerto libre, base 8989)
- `BPSR_ENABLE_LAN=false`
- `BPSR_REQUIRE_TOKEN=true`

Más variables y ejemplos en [configuracion.md](./configuracion.md).

## Ejecución local
- `pnpm install`
- `pnpm start`

Electron generará un token de sesión y abrirá `index.html?token=...`. El frontend enviará dicho token en `x-bpsr-token` a `/api/*`.

## Endpoints y WebSocket
- Ver [api.md](./api.md)

## Almacenamiento
- Ver [almacenamiento.md](./almacenamiento.md)

## Empaquetado
- Ver [empaquetado-windows.md](./empaquetado-windows.md)

## Pruebas
- Ver [pruebas.md](./pruebas.md)

## Diagramas
- Fuentes PlantUML en `docs/puml/`. Exporta PNGs locales según [pruebas.md](./pruebas.md) o [empaquetado-windows.md](./empaquetado-windows.md).

## Aviso
Herramienta para uso local. No expone servicios por defecto. Úsala de forma responsable.
