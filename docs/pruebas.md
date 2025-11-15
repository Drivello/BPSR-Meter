# Pruebas (Jest + Supertest)

- Ejecutar: `pnpm test` (usa `BPSR_SKIP_SNIFFER=1`).
- Casos incluidos:
  - Token obligatorio en `/api/*` (401 sin token, 200 con token).
  - CORS: sólo orígenes permitidos exponen `access-control-allow-origin`.
  - Rate-limit: 429 al superar el máximo.
  - `safeJoin()` bloquea traversal.
  - Higiene: no quedan `exec(`, `spawn(`, `taskkill`, `netstat`.

Para exportar PNGs de PlantUML:
- Instala PlantUML localmente y ejecuta, por ejemplo:
```bash
plantuml -tpng -o docs/img docs/puml/*.puml
```
- Alternativa (Windows): usa el `.jar` de PlantUML con Java.
