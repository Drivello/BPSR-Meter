# Cambios de seguridad aplicados

- Local-only por defecto; LAN opt-in.
- Token obligatorio en `/api/*` y Socket.io; CORS estricto; rate-limit.
- FS confinado a `DATA_DIR` con `safeJoin()`.
- `clear-logs` confinado a `DATA_DIR/logs`.
- Volcados binarios desactivados por defecto; `BPSR_DEBUG` los habilita con rotación.
- UI sin CDNs; iconos Unicode.
- NSIS per-user sin elevación.
- Tests de seguridad (Jest/Supertest) y de higiene de comandos.
