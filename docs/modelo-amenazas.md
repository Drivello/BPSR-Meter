# Modelo de amenazas (STRIDE resumido)

- Spoofing: Token por petición (`x-bpsr-token`), WS handshake con auth.
- Tampering: FS confinado a `DATA_DIR` + `safeJoin()`.
- Repudiation: Logs mínimos; sin telemetría.
- Information Disclosure: No expone LAN por defecto; CORS estricto.
- Denial of Service: Rate-limit básico por IP.
- Elevation of Privilege: Electron sin nodeIntegration; sin instaladores externos.
