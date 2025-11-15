# Troubleshooting

- **No hay datos**: inicia el juego antes que el medidor; revisa Npcap.
- **Npcap no instalado**: instala manualmente desde https://nmap.org/npcap/.
- **CORS 403/no `allow-origin`**: ajusta `BPSR_ALLOWED_ORIGINS` o usa `localhost/127.0.0.1`.
- **401 Unauthorized**: añade `x-bpsr-token` correcto.
- **Rate-limit 429**: reduce peticiones o amplía `BPSR_RATE_*`.
- **Puerto ocupado**: usa `BPSR_PORT=0`.

## El servidor no respondió a tiempo

- **Síntoma**: Pantalla de error indicando que el backend no respondió dentro del tiempo de arranque.
- **Pasos**:
  - Revisa `iniciar_log.txt` (UTF-8) en `userData/` para ver los eventos de arranque y la causa (bind, permisos, etc.).
  - Ajusta `BPSR_STARTUP_TIMEOUT_MS` en tu `.env` si tu equipo inicia más lento.
  - Verifica manualmente `GET http://127.0.0.1:<puerto>/healthz` en el navegador o con `curl`.
  - Si el puerto está ocupado, configura `BPSR_PORT=0` (y opcionalmente `BPSR_PORT_BASE`).
  - Ejecuta el diagnóstico: `npm run doctor` o `pnpm doctor`.
