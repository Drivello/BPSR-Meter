# Empaquetado Windows (NSIS per-user)

- Build: `pnpm dist`
- Configuración `electron-builder`:
  - Instalación por usuario (`perMachine: false`).
  - Sin elevación (`allowElevation: false`).
  - Desinstalación puede borrar datos de usuario (opcional, control en NSIS/installer).

Artefactos en `dist_electron/`.
