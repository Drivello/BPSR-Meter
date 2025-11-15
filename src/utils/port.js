const net = require('net');

function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err && (err.code === 'EADDRINUSE' || err.code === 'EACCES')) return resolve(false);
      return resolve(false);
    });
    server.listen({ port, host, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
    server.unref();
  });
}

function listenOn(port, host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', (err) => reject(err));
    server.listen({ port, host, exclusive: true }, () => {
      const addr = server.address();
      const selected = typeof addr === 'string' ? port : addr.port;
      server.close(() => resolve(selected));
    });
    server.unref();
  });
}

async function findAvailablePort(preferredPort = 0, host = '127.0.0.1', maxAttempts = 20) {
  const start = Number(preferredPort) || 0;
  if (start <= 0) {
    try {
      return await listenOn(0, host);
    } catch (_) {}
  }
  for (let i = 0; i <= maxAttempts; i++) {
    const p = start > 0 ? start + i : 0;
    try {
      const selected = await listenOn(p, host);
      return selected;
    } catch (e) {
      if (!e || (e.code !== 'EADDRINUSE' && e.code !== 'EACCES')) {
        continue;
      }
    }
  }
  return listenOn(0, host);
}

module.exports = {
  checkPort,
  findAvailablePort,
};
