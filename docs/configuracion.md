# Configuración (.env)

- **BPSR_HOST**: Host de escucha. Por defecto `127.0.0.1`.
- **BPSR_PORT**: Puerto. `0` permite puerto libre iniciando en 8989.
- **BPSR_ENABLE_LAN**: `true/false`. Si `true`, bind `0.0.0.0` y token obligatorio.
- **BPSR_REQUIRE_TOKEN**: `true/false`. Si `true`, todas las rutas `/api/*` exigen token.
- **BPSR_API_TOKEN**: Token estático. Si vacío y requerido: se genera y persiste en `settings.json` (no se imprime).
- **BPSR_ALLOWED_ORIGINS**: Orígenes permitidos (CORS), coma-separados.
- **BPSR_DATA_DIR**: Directorio de datos. Por defecto `userData/bpsr`.
- **BPSR_HISTORY_SAVE**: `true/false`. Guardar histórico de encuentros.
- **BPSR_FIGHT_LOG**: `true/false`. `fight.log` por encuentro.
- **BPSR_LOG_RETENTION_DAYS**: Días de retención para purga automática.
- **BPSR_RATE_WINDOW_MS**: Ventana del rate-limit.
- **BPSR_RATE_MAX**: Máximo de peticiones por ventana/IP.
- **BPSR_DEBUG**: `1/true` para habilitar volcados binarios en `DATA_DIR/debug` con rotación.

## Ejemplo
```env
BPSR_HOST=127.0.0.1
BPSR_PORT=0
BPSR_ENABLE_LAN=false
BPSR_REQUIRE_TOKEN=true
BPSR_ALLOWED_ORIGINS=
BPSR_HISTORY_SAVE=false
BPSR_FIGHT_LOG=false
BPSR_LOG_RETENTION_DAYS=7
BPSR_RATE_WINDOW_MS=1000
BPSR_RATE_MAX=60
BPSR_DEBUG=0
```
