const { settingsState, persistSettingsState } = require('../data/settings');

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

async function handleSettings(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/settings') {
    sendJson(response, 200, { success: true, data: settingsState });
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/settings') {
    const body = await readBody(request).catch(() => null);
    if (!body || typeof body !== 'object') {
      sendJson(response, 400, { success: false, message: '设置内容格式错误' });
      return true;
    }

    Object.assign(settingsState, body, { updatedAt: new Date().toISOString() });
    persistSettingsState();
    sendJson(response, 200, { success: true, data: settingsState });
    return true;
  }

  return false;
}

module.exports = {
  handleSettings,
};
