# Almacenamiento (DATA_DIR)

- `settings.json`: Preferencias y `apiToken` (si se autogenera).
- `logs/`:
  - `<timestamp>/summary.json`
  - `<timestamp>/allUserData.json`
  - `<timestamp>/users/<uid>.json`
  - `<timestamp>/fight.log`
- `debug/` (si `BPSR_DEBUG=1`):
  - `SyncContainerData-<ts>.dat` (rotación hasta 10 archivos)
- `logs_dps.json`: vistas previas del último encuentro.

Retención:
- `BPSR_LOG_RETENTION_DAYS` purga directorios `logs/<timestamp>` antiguos.

Seguridad:
- Todas las rutas de FS pasan por `safeJoin()` en `src/server/paths.js`.
