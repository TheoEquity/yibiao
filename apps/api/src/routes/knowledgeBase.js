const { knowledgeBase, persistKnowledgeBase } = require('../data/knowledgeBase');
const { storeKnowledgeBaseFile } = require('../data/uploadStore');
const { parseDocumentFromFile } = require('../utils/documentParser');

function isTextExtension(extension) {
  return ['.md', '.markdown', '.txt', '.json', '.csv'].includes(String(extension || '').toLowerCase());
}

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

function extractKnowledgeItems(content, fileName) {
  const lines = String(content || '').split('\n');
  const headings = lines.filter((line) => /^#+\s+/.test(line)).map((line) => line.replace(/^#+\s+/, '').trim());
  const blocks = String(content || '').split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  const source = headings.length > 0 ? headings : blocks.slice(0, 8).map((block) => block.slice(0, 24));

  return source.slice(0, 8).map((title, index) => ({
    id: `kb-item-${Date.now()}-${index + 1}`,
    title: title || `知识条目 ${index + 1}`,
    resume: `来自 ${fileName} 的第 ${index + 1} 个知识摘要。`,
    content: blocks[index] || String(content || '').slice(0, 500),
    source_file: fileName,
  }));
}

async function handleKnowledgeBase(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/knowledge-base') {
    sendJson(response, 200, { success: true, data: knowledgeBase });
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/knowledge-base/folders') {
    const body = await readBody(request).catch(() => null);
    if (!body || !body.name) {
      sendJson(response, 400, { success: false, message: '文件夹名称不能为空' });
      return true;
    }

    const folder = {
      id: `kb-folder-${Date.now()}`,
      name: String(body.name),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    knowledgeBase.folders.unshift(folder);
    persistKnowledgeBase();
    sendJson(response, 201, { success: true, data: folder });
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/knowledge-base/documents') {
    const body = await readBody(request).catch(() => null);
    if (!body || !body.folderId || !body.fileName || (!body.content && !body.contentBase64)) {
      sendJson(response, 400, { success: false, message: '知识库文档参数不完整' });
      return true;
    }

    const documentId = `kb-doc-${Date.now()}`;
    const extension = String(body.extension || '').toLowerCase() || `.${String(body.fileName).split('.').pop() || 'md'}`;
    let uploadedFile = null;
    let markdown = String(body.content || '');
    let items = [];
    let warnings = [];

    if (body.contentBase64) {
      uploadedFile = storeKnowledgeBaseFile(documentId, {
        fileName: body.fileName,
        contentBase64: body.contentBase64,
        mimeType: body.mimeType,
      });

      const parser = isTextExtension(extension) ? 'text' : 'docling';
      const parsedResult = parseDocumentFromFile(uploadedFile.filePath, parser);
      markdown = parsedResult.markdown || markdown;
      warnings = parsedResult.warnings || [];
      items = extractKnowledgeItems(markdown, String(body.fileName));
    } else {
      items = extractKnowledgeItems(markdown, String(body.fileName));
    }

    const document = {
      id: documentId,
      folder_id: String(body.folderId),
      file_name: String(body.fileName),
      status: 'success',
      progress: 100,
      message: '已完成知识条目抽取',
      item_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      markdown,
      extension,
      mime_type: String(body.mimeType || uploadedFile?.mimeType || 'text/plain'),
      size: Number(body.size || uploadedFile?.size || 0),
      storage: uploadedFile,
      warnings,
    };
    document.item_count = items.length;
    knowledgeBase.documents.unshift(document);
    knowledgeBase.items[document.id] = items;
    persistKnowledgeBase();
    sendJson(response, 201, { success: true, data: { document, items } });
    return true;
  }

  const documentMatch = url.pathname.match(/^\/knowledge-base\/documents\/([^/]+)$/);
  if (request.method === 'GET' && documentMatch) {
    const document = knowledgeBase.documents.find((item) => item.id === documentMatch[1]);
    if (!document) {
      sendJson(response, 404, { success: false, message: '知识库文档不存在' });
      return true;
    }

    sendJson(response, 200, {
      success: true,
      data: {
        document,
        items: knowledgeBase.items[document.id] || [],
      },
    });
    return true;
  }

  return false;
}

module.exports = {
  handleKnowledgeBase,
};
