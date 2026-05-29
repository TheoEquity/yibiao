const { tasks, subscribe } = require('../data/tasks');

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function handleTasks(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/tasks') {
    sendJson(response, 200, { success: true, data: tasks });
    return true;
  }

  const detailMatch = url.pathname.match(/^\/tasks\/([^/]+)$/);
  if (request.method === 'GET' && detailMatch) {
    const task = tasks.find((item) => item.id === detailMatch[1]);
    if (!task) {
      sendJson(response, 404, { success: false, message: '任务不存在' });
      return true;
    }
    sendJson(response, 200, { success: true, data: task });
    return true;
  }

  if (request.method === 'GET' && url.pathname === '/tasks/stream') {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    response.write(': connected\n\n');
    subscribe(response);
    return true;
  }

  return false;
}

module.exports = {
  handleTasks,
};
