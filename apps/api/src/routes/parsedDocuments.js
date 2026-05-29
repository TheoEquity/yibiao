const { parsedDocuments } = require('../data/parsedDocuments');

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function handleParsedDocuments(request, response, url) {
  const detailMatch = url.pathname.match(/^\/parsed-documents\/([^/]+)$/);
  if (request.method === 'GET' && detailMatch) {
    const parsedDocument = parsedDocuments.find((item) => item.id === detailMatch[1]);
    if (!parsedDocument) {
      sendJson(response, 404, { success: false, message: '解析结果不存在' });
      return true;
    }

    sendJson(response, 200, { success: true, data: parsedDocument });
    return true;
  }

  return false;
}

module.exports = {
  handleParsedDocuments,
};
