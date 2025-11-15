
const { app, BrowserWindow, ipcMain } = require('electron');
try { require('dotenv').config(); } catch (e) {}
const path = require('path');
const { fork } = require('child_process');
const { findAvailablePort } = require(path.join(__dirname, 'src', 'utils', 'port'));
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');

// Función para loguear en archivo seguro para entorno empaquetado
function logToFile(msg) {
    try {
        const userData = app.getPath('userData');
        const logPath = path.join(userData, 'iniciar_log.txt');
        const timestamp = new Date().toISOString();
        fs.mkdirSync(userData, { recursive: true });
        fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
    } catch (e) {
        // Si hay error, mostrar en consola
        console.error('Error escribiendo log:', e);
    }
}


let mainWindow;
let serverProcess;
let server_port = 8989; // Puerto inicial
let isLocked = false; // Estado inicial del candado: desbloqueado
logToFile('==== INICIO DE ELECTRON ====');


    

    async function createWindow() {
        const defaultDataDir = path.join(app.getPath('userData'), 'bpsr');
        try { fs.mkdirSync(defaultDataDir, { recursive: true }); } catch (e) {}

        const envPort = parseInt(process.env.BPSR_PORT || '', 10);
        const envBase = parseInt(process.env.BPSR_PORT_BASE || '', 10);
        const basePort = Number.isFinite(envBase) && envBase > 0 ? envBase : 8989;
        if (Number.isFinite(envPort) && envPort > 0) {
            server_port = envPort;
            logToFile('Usando puerto especificado por BPSR_PORT: ' + server_port);
        } else {
            server_port = await findAvailablePort(basePort, '127.0.0.1');
            logToFile('Puerto disponible encontrado: ' + server_port + ' (base ' + basePort + ')');
        }

        const sessionToken = crypto.randomBytes(24).toString('hex');

        mainWindow = new BrowserWindow({
            width: 650,
            height: 600,
            transparent: true,
            frame: false,
            alwaysOnTop: true,
            resizable: false,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
                webSecurity: true,
                allowRunningInsecureContent: false,
                enableRemoteModule: false,
            },
            icon: path.join(__dirname, 'icon.ico'),
        });

        // Iniciar el servidor Node.js, pasando el puerto como argumento

        // Determinar ruta absoluta a server.js según entorno
        let serverPath;
        if (process.defaultApp || process.env.NODE_ENV === 'development') {
            // Modo desarrollo
            serverPath = path.join(__dirname, 'server.js');
        } else {
            // Modo empaquetado: usar app.getAppPath() para acceder dentro del asar
            serverPath = path.join(app.getAppPath(), 'server.js');
        }
        logToFile('Lanzando server.js en puerto ' + server_port + ' con ruta: ' + serverPath);

        // Usar fork para lanzar el servidor como proceso hijo
        serverProcess = fork(serverPath, [server_port], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            execArgv: [],
            env: { ...process.env, BPSR_DATA_DIR_DEFAULT: defaultDataDir, BPSR_API_TOKEN: sessionToken }
        });

        const healthPath = process.env.BPSR_HEALTH_PATH && process.env.BPSR_HEALTH_PATH.trim() ? process.env.BPSR_HEALTH_PATH.trim() : '/healthz';
        const startupTimeoutMs = Number.isFinite(parseInt(process.env.BPSR_STARTUP_TIMEOUT_MS, 10)) ? parseInt(process.env.BPSR_STARTUP_TIMEOUT_MS, 10) : 15000;
        let serverBaseUrl = `http://localhost:${server_port}`;

        const waitForHealth = (baseUrl, timeoutMs) => new Promise((resolve, reject) => {
            const start = Date.now();
            const poll = () => {
                if (Date.now() - start > timeoutMs) {
                    return reject(new Error('Timeout esperando /healthz'));
                }
                try {
                    const req = http.get(baseUrl + healthPath, (res) => {
                        if (res.statusCode === 200) {
                            resolve();
                        } else {
                            setTimeout(poll, 300);
                        }
                    });
                    req.on('error', () => setTimeout(poll, 300));
                    req.setTimeout(2000, () => {
                        try { req.destroy(); } catch (_) {}
                        setTimeout(poll, 300);
                    });
                } catch (_) {
                    setTimeout(poll, 300);
                }
            };
            poll();
        });

        serverProcess.stdout.on('data', (data) => {
            const text = data.toString();
            logToFile('server stdout: ' + text);
            const match = text.match(/Servidor web iniciado en (http:\/\/localhost:\d+)/);
            if (match && match[1]) {
                serverBaseUrl = match[1];
                logToFile('Detectado URL servidor: ' + serverBaseUrl);
            }
        });
        serverProcess.stderr.on('data', (data) => {
            logToFile('server stderr: ' + data);
        });
        serverProcess.on('close', (code) => {
            logToFile('server process exited with code ' + code);
        });

        // Esperar readiness antes de cargar UI
        try {
            logToFile(`Esperando readiness en ${serverBaseUrl}${healthPath} (timeout ${startupTimeoutMs}ms)...`);
            await waitForHealth(serverBaseUrl, startupTimeoutMs);
            logToFile('Backend listo, cargando UI...');
            mainWindow.loadURL(`${serverBaseUrl}/index.html?token=${sessionToken}`);
        } catch (err) {
            logToFile('ERROR: Startup timeout - ' + err.message);
            try { serverProcess.kill('SIGTERM'); } catch (_) {}
            const logPath = path.join(app.getPath('userData'), 'iniciar_log.txt');
            const html = `<div style="font-family:sans-serif;padding:16px;color:#c00;">
                <h2>Error: El servidor no respondió a tiempo</h2>
                <p>Revisa el log en: <code>${logPath.replace(/\\/g, '/')}</code></p>
            </div>`;
            mainWindow.loadURL('data:text/html,' + encodeURIComponent(html));
        }

        mainWindow.on('closed', () => {
            mainWindow = null;
            if (serverProcess) {
                // Enviar SIGTERM para un cierre limpio
                serverProcess.kill('SIGTERM');
                // Forzar la terminación si no se cierra después de un tiempo
                setTimeout(() => {
                    if (!serverProcess.killed) {
                        serverProcess.kill('SIGKILL');
                    }
                }, 5000);
            }
        });

    // Manejar el evento para hacer la ventana movible/no movible
    ipcMain.on('set-window-movable', (event, movable) => {
        if (mainWindow) {
            mainWindow.setMovable(movable);
        }
    });

    // Manejar el evento para cerrar la ventana
    ipcMain.on('close-window', () => {
        if (mainWindow) {
            mainWindow.close();
        }
    });

    // Manejar el evento para redimensionar la ventana
    ipcMain.on('resize-window', (event, width, height) => {
        if (mainWindow) {
            mainWindow.setSize(width, height);
        }
    });

    // Manejar el evento para alternar el estado del candado
    ipcMain.on('toggle-lock-state', () => {
        if (mainWindow) {
            isLocked = !isLocked;
            mainWindow.setMovable(!isLocked); // Hacer la ventana movible o no
            if (isLocked) {
                // Cuando se bloquea, ignorar eventos del ratón y reenviarlos al juego
                mainWindow.setIgnoreMouseEvents(true, { forward: true });
            } else {
                // Cuando se desbloquea, procesar eventos del ratón normalmente
                mainWindow.setIgnoreMouseEvents(false);
            }
            mainWindow.webContents.send('lock-state-changed', isLocked); // Notificar al renderizador
            console.log(`Candado: ${isLocked ? 'Cerrado' : 'Abierto'}`);
        }
    });

    // Enviar el estado inicial del candado al renderizador una vez que la ventana esté lista
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('lock-state-changed', isLocked);
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
