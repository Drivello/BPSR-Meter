# Seguridad en Electron

- `BrowserWindow.webPreferences`:
  - `contextIsolation: true`
  - `sandbox: true`
  - `nodeIntegration: false`
  - `webSecurity: true`
  - `allowRunningInsecureContent: false`
  - `enableRemoteModule: false`
- `preload.js` expone API mínima vía `contextBridge` e IPC validado.
- Token de sesión se genera en `electron-main.js` y se pasa vía querystring al renderer (no se imprime en logs).
