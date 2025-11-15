try { require('dotenv').config(); } catch (e) {}
const winston = require('winston');
const readline = require('readline');
const path = require('path');
const fsPromises = require('fs').promises;
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const zlib = require('zlib');
const crypto = require('crypto');
const { findAvailablePort } = require(path.join(__dirname, 'src', 'utils', 'port'));

const { UserDataManager } = require(path.join(__dirname, 'src', 'server', 'dataManager'));
const Sniffer = require(path.join(__dirname, 'src', 'server', 'sniffer'));
const initializeApi = require(path.join(__dirname, 'src', 'server', 'api'));
const PacketProcessor = require(path.join(__dirname, 'algo', 'packet')); // Asegúrate de que esta ruta sea correcta
const { getSettingsPath, getLogsDir, DATA_DIR } = require(path.join(__dirname, 'src', 'server', 'paths'));

const VERSION = '3.1';
const SETTINGS_PATH = getSettingsPath();

let globalSettings = {
    autoClearOnServerChange: true,
    autoClearOnTimeout: false,
    onlyRecordEliteDummy: false,
    enableFightLog: false,
    enableDpsLog: false,
    enableHistorySave: false,
    isPaused: false, // Añadir estado de pausa global
};

let server_port;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

function toBoolEnv(value, defaultVal = false) {
    if (value === undefined || value === null) return defaultVal;
    const s = String(value).trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

async function main() {
    const logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf((info) => {
                return `[${info.timestamp}] [${info.level}] ${info.message}`;
            }),
        ),
        transports: [new winston.transports.Console()],
    });

    console.clear();
    console.log('###################################################');
    console.log('#                                                 #');
    console.log('#             BPSR Meter - Iniciando              #');
    console.log('#                                                 #');
    console.log('###################################################');
    console.log('\nCargando configuración desde .env (si existe)...');

    // Cargar configuración global
    let loadedSettingsRaw = {};
    try {
        await fsPromises.access(SETTINGS_PATH);
        const data = await fsPromises.readFile(SETTINGS_PATH, 'utf8');
        loadedSettingsRaw = JSON.parse(data || '{}');
        Object.assign(globalSettings, loadedSettingsRaw);
    } catch (e) {
        if (e.code !== 'ENOENT') {
            logger.error('Failed to load settings:', e);
        }
    }

    // Aplicar overrides desde variables de entorno
    globalSettings.enableHistorySave = toBoolEnv(process.env.BPSR_HISTORY_SAVE, globalSettings.enableHistorySave);
    globalSettings.enableFightLog = toBoolEnv(process.env.BPSR_FIGHT_LOG, globalSettings.enableFightLog);

    const userDataManager = new UserDataManager(logger, globalSettings);
    await userDataManager.initialize();
    console.log(`DATA_DIR: ${DATA_DIR}`);

    const sniffer = new Sniffer(logger, userDataManager, globalSettings); // Pasar globalSettings al sniffer

    // Obtener número de dispositivo desde CLI
    const args = process.argv.slice(2);
    let current_arg_index = 0;

    if (args[current_arg_index] && !isNaN(parseInt(args[current_arg_index]))) {
        server_port = parseInt(args[current_arg_index]);
        current_arg_index++;
    }

    let deviceNum = args[current_arg_index];

    if (String(process.env.BPSR_SKIP_SNIFFER || '').trim() !== '1') {
        console.log('Verificando Npcap...');
        try {
            await sniffer.start(deviceNum, PacketProcessor);
        } catch (error) {
            logger.error(`Error al iniciar el sniffer: ${error.message}`);
            rl.close();
            process.exit(1);
        }
    } else {
        logger.warn('BPSR_SKIP_SNIFFER=1: Ejecutando sin capturar paquetes (modo prueba).');
    }

    logger.level = 'error';

    process.on('SIGINT', async () => {
        console.log('\nCerrando aplicación...');
        rl.close();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\nCerrando aplicación...');
        rl.close();
        process.exit(0);
    });

    setInterval(() => {
        if (!globalSettings.isPaused) {
            userDataManager.updateAllRealtimeDps();
        }
    }, 100);

    const enableLan = toBoolEnv(process.env.BPSR_ENABLE_LAN, false);
    let host = (process.env.BPSR_HOST && process.env.BPSR_HOST.trim()) || (enableLan ? '0.0.0.0' : '127.0.0.1');
    if (!host) host = '127.0.0.1';
    let requireToken = toBoolEnv(process.env.BPSR_REQUIRE_TOKEN, true);
    if (enableLan) requireToken = true;
    let apiToken = (process.env.BPSR_API_TOKEN || '').trim();
    if (requireToken && !apiToken) {
        // try read from settings
        if (loadedSettingsRaw && typeof loadedSettingsRaw === 'object' && loadedSettingsRaw.apiToken) {
            apiToken = String(loadedSettingsRaw.apiToken);
        }
        // generate and persist if still missing
        if (!apiToken) {
            apiToken = crypto.randomBytes(24).toString('hex');
            try {
                const settingsNext = { ...loadedSettingsRaw, apiToken };
                await fsPromises.writeFile(SETTINGS_PATH, JSON.stringify(settingsNext, null, 2));
            } catch (_) {}
        }
        process.env.BPSR_API_TOKEN = apiToken;
    }
    const defaultOrigins = [`http://127.0.0.1:${server_port}`, `http://localhost:${server_port}`];
    let allowedOrigins = (process.env.BPSR_ALLOWED_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (allowedOrigins.length === 0) allowedOrigins = defaultOrigins;
    if (enableLan && (process.env.BPSR_ALLOWED_ORIGINS || '').trim() === '') {
        console.log('LAN habilitado sin BPSR_ALLOWED_ORIGINS; CORS permite solo orígenes locales por defecto.');
    }
    const rateWindowMsEnv = parseInt(process.env.BPSR_RATE_WINDOW_MS, 10);
    const rateMaxEnv = parseInt(process.env.BPSR_RATE_MAX, 10);
    const portBaseEnv = parseInt(process.env.BPSR_PORT_BASE, 10);
    const portBase = Number.isFinite(portBaseEnv) && portBaseEnv > 0 ? portBaseEnv : 8989;
    const startupTimeoutEnv = parseInt(process.env.BPSR_STARTUP_TIMEOUT_MS, 10);
    const startupTimeoutMs = Number.isFinite(startupTimeoutEnv) && startupTimeoutEnv > 0 ? startupTimeoutEnv : 15000;
    const healthPath = (process.env.BPSR_HEALTH_PATH && process.env.BPSR_HEALTH_PATH.trim()) || '/healthz';
    const securityConfig = {
        enableLan,
        host,
        requireToken,
        apiToken,
        allowedOrigins,
        rateWindowMs: Number.isFinite(rateWindowMsEnv) ? rateWindowMsEnv : 1000,
        rateMax: Number.isFinite(rateMaxEnv) ? rateMaxEnv : 60,
    };

    if (enableLan && (!requireToken || (process.env.BPSR_ALLOWED_ORIGINS || '').trim() === '')) {
        console.error('Configuración inválida: BPSR_ENABLE_LAN=true requiere BPSR_REQUIRE_TOKEN=true y BPSR_ALLOWED_ORIGINS no vacío.');
        process.exit(1);
    }

    // Selección de puerto: respetar CLI -> env -> búsqueda desde base
    if (server_port === undefined || server_port === null) {
        const envPort = parseInt(process.env.BPSR_PORT, 10);
        if (Number.isFinite(envPort)) {
            if (envPort === 0) {
                server_port = await findAvailablePort(portBase, host);
            } else {
                server_port = envPort;
            }
        } else {
            server_port = await findAvailablePort(portBase, host);
        }
    }

    console.log(`Entorno efectivo: HOST=${host}, PORT=${server_port}, PORT_BASE=${portBase}, LAN=${enableLan}, REQUIRE_TOKEN=${requireToken}, ALLOWED_ORIGINS=${allowedOrigins.length}, RATE={${Number.isFinite(rateWindowMsEnv)?rateWindowMsEnv:1000}/${Number.isFinite(rateMaxEnv)?rateMaxEnv:60}}, STARTUP_TIMEOUT_MS=${startupTimeoutMs}, HEALTH_PATH=${healthPath}`);

    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: {
            origin: securityConfig.allowedOrigins,
            methods: ['GET', 'POST'],
        },
    });

    io.use((socket, next) => {
        if (!securityConfig.requireToken) return next();
        const headerToken = socket.handshake && socket.handshake.headers && socket.handshake.headers['x-bpsr-token'];
        const authToken = socket.handshake && socket.handshake.auth && socket.handshake.auth.token;
        const token = authToken || headerToken;
        if (token && token === securityConfig.apiToken) return next();
        return next(new Error('Unauthorized'));
    });

    const health = { ready: false, path: healthPath };
    console.log('Inicializando API y rutas...');
    initializeApi(app, server, io, userDataManager, logger, globalSettings, securityConfig, health); // Inicializar API con seguridad

    server.on('error', (err) => {
        console.error('Error al iniciar servidor HTTP:', err && err.message ? err.message : String(err));
        process.exit(1);
    });
    server.listen(server_port, host, () => {
        const actualPort = server.address() && typeof server.address() !== 'string' ? server.address().port : server_port;
        const localUrl = `http://localhost:${actualPort}`;
        console.log(`Servidor web iniciado en ${localUrl}. Acceso local permitido.`);
        if (enableLan) {
            console.log(`LAN habilitado. Si CORS lo permite, puedes acceder desde otra PC usando http://[TU_IP_LOCAL]:${actualPort}/index.html`);
        }
        console.log('Servidor WebSocket iniciado');
        health.ready = true;
    });

    console.log('¡Bienvenido a BPSR Meter!');
    console.log('Detectando servidor de juego, por favor espera...');

    // Intervalo para limpiar la caché de fragmentos IP y TCP
    setInterval(() => {
        userDataManager.checkTimeoutClear();
    }, 10000);

    // Limpieza de logs antiguos basada en BPSR_LOG_RETENTION_DAYS
    const retentionDays = parseInt(process.env.BPSR_LOG_RETENTION_DAYS, 10);
    const maxAgeMs = Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays * 24 * 60 * 60 * 1000 : null;
    if (maxAgeMs) {
        try {
            const logsDir = getLogsDir();
            fsPromises.readdir(logsDir, { withFileTypes: true }).then(async (entries) => {
                const now = Date.now();
                for (const ent of entries) {
                    if (ent.isDirectory() && /^\d+$/.test(ent.name)) {
                        const ts = Number(ent.name);
                        if (Number.isFinite(ts) && now - ts > maxAgeMs) {
                            const p = path.join(logsDir, ent.name);
                            try { await fsPromises.rm(p, { recursive: true, force: true }); } catch (_) {}
                        }
                    }
                }
            }).catch(() => {});
        } catch (_) {}
    }
}

if (!zlib.zstdDecompressSync) {
    console.log('zstdDecompressSync is not available! Please update your Node.js!');
    process.exit(1);
}

main();
