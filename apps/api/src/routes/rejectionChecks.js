const { rejectionCheckWorkspace, persistRejectionCheckWorkspace } = require('../data/rejectionChecks');
const { storeRejectionCheckFile } = require('../data/uploadStore');
const { parseDocumentFromFile } = require('../utils/documentParser');
const { buildRejectionCheckReport } = require('../utils/reportExporter');
const fs = require('node:fs');

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

function extractRejectionItems(markdown) {
  const lines = String(markdown || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const matched = lines.filter((line) => /废标|无效|否决|不响应|不符合|必须|应当|不得|未提供/.test(line));
  return (matched.length > 0 ? matched : lines.slice(0, 6)).map((line, index) => ({
    id: `rejection-item-${index + 1}`,
    title: `检查项 ${index + 1}`,
    source: line,
    suggestion: '请在投标文件中逐条给出显式响应和证据。',
    severity: /废标|无效|否决|不得/.test(line) ? 'high' : 'medium',
  }));
}

function normalizeText(text) {
  return String(text || '').toLowerCase().replace(/[^\p{L}\p{N}\u4e00-\u9fa5]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

function extractEvidenceSnippet(content, keywords) {
  const paragraphs = String(content || '').split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
  return paragraphs.find((paragraph) => keywords.some((keyword) => paragraph.includes(keyword))) || '';
}

function runRejectionChecks() {
  const bidContent = String(rejectionCheckWorkspace.bidDocument?.content || '');
  const items = rejectionCheckWorkspace.extractedItems || [];
  const normalizedBidContent = normalizeText(bidContent);

  const findings = items.map((item, index) => {
    const keywords = normalizeText(item.source).split(' ').filter((token) => token.length >= 2).slice(0, 6);
    const matchedTokens = keywords.filter((token) => normalizedBidContent.includes(token));
    const evidence = extractEvidenceSnippet(bidContent, keywords);
    const coverage = keywords.length > 0 ? matchedTokens.length / keywords.length : 0;

    if (coverage >= 0.6 && evidence) {
      return null;
    }

    return {
      id: `rejection-finding-${index + 1}`,
      type: 'rejectionItem',
      severity: coverage >= 0.3 ? 'medium' : item.severity,
      title: item.title,
      summary: coverage >= 0.3
        ? `投标文件仅部分覆盖“${item.source.slice(0, 20)}”的要求，仍需补充直接响应。`
        : `投标文件中缺少对“${item.source.slice(0, 20)}”的明确响应。`,
      requirement: item.source,
      bidEvidence: evidence || '当前正文中未检索到稳定呼应片段。',
      riskReason: coverage >= 0.3
        ? '现有内容与招标要求存在弱关联，缺少明确映射和承诺表达。'
        : '缺少直接响应可能导致评审时被判定为未实质性响应。',
      suggestion: item.suggestion,
    };
  }).filter(Boolean);

  const typoPatterns = [
    { id: 'placeholder', regex: /TODO|待补充|XXX/i, wrongText: 'TODO / 待补充 / XXX', correctText: '补充为正式投标表述', reason: '正式投标文件中不应保留占位词。' },
    { id: 'double-punct', regex: /，，|。。|；；/, wrongText: '重复标点', correctText: '删除多余标点', reason: '重复标点会影响正式文件质量。' },
  ];

  const typoFindings = typoPatterns
    .filter((item) => item.regex.test(bidContent))
    .map((item, index) => ({
      id: `typo-${index + 1}`,
      wrongText: item.wrongText,
      correctText: item.correctText,
      originalExcerpt: extractEvidenceSnippet(bidContent, [item.wrongText.split(' ')[0]]) || '检测到对应问题片段。',
      reason: item.reason,
      locationHint: '正文草稿',
    }));

  const logicChecks = [
    { id: 'logic-1', title: '正文缺少实施承诺主线', keywords: ['实施', '交付', '验收'], suggestion: '补充实施路径、交付保障和验收承诺。' },
    { id: 'logic-2', title: '正文缺少服务保障说明', keywords: ['服务', '运维', '培训'], suggestion: '补充服务承诺、运维支持和培训安排。' },
  ];

  const logicFindings = logicChecks
    .filter((item) => !item.keywords.some((keyword) => bidContent.includes(keyword)))
    .map((item) => ({
      id: item.id,
      title: item.title,
      originalText: `当前投标文件缺少与“${item.keywords.join(' / ')}”相关的稳定段落。`,
      locationHint: '正文整体',
      fallacyReason: '投标文件与招标要求之间缺少完整响应闭环。',
      suggestion: item.suggestion,
    }));

  return {
    rejection: {
      status: 'success',
      findings,
      updatedAt: new Date().toISOString(),
    },
    typo: {
      status: 'success',
      findings: typoFindings,
      updatedAt: new Date().toISOString(),
    },
    logic: {
      status: 'success',
      findings: logicFindings,
      updatedAt: new Date().toISOString(),
    },
  };
}

function applyReviewState(findings, reviewStates, type) {
  return findings.map((item) => ({
    ...item,
    review: reviewStates?.[`${type}:${item.id}`] || { status: 'pending', note: '' },
  }));
}

function buildReviewedResult() {
  const checkResult = runRejectionChecks();
  const reviewStates = rejectionCheckWorkspace.reviewStates || {};

  return {
    rejection: {
      ...checkResult.rejection,
      findings: applyReviewState(checkResult.rejection.findings, reviewStates, 'rejection'),
    },
    typo: {
      ...checkResult.typo,
      findings: applyReviewState(checkResult.typo.findings, reviewStates, 'typo'),
    },
    logic: {
      ...checkResult.logic,
      findings: applyReviewState(checkResult.logic.findings, reviewStates, 'logic'),
    },
  };
}

async function handleRejectionChecks(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/rejection-check') {
    sendJson(response, 200, { success: true, data: rejectionCheckWorkspace });
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/rejection-check/export-report') {
    rejectionCheckWorkspace.reportDocument = buildRejectionCheckReport(rejectionCheckWorkspace);
    rejectionCheckWorkspace.updatedAt = new Date().toISOString();
    persistRejectionCheckWorkspace();
    sendJson(response, 200, { success: true, data: rejectionCheckWorkspace.reportDocument });
    return true;
  }

  if (request.method === 'GET' && url.pathname === '/rejection-check/report-document') {
    if (!rejectionCheckWorkspace.reportDocument?.download?.filePath || !fs.existsSync(rejectionCheckWorkspace.reportDocument.download.filePath)) {
      sendJson(response, 404, { success: false, message: '检查报告不存在，请先导出' });
      return true;
    }

    response.writeHead(200, {
      'Content-Type': rejectionCheckWorkspace.reportDocument.download.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(rejectionCheckWorkspace.reportDocument.fileName)}"`,
    });
    response.end(fs.readFileSync(rejectionCheckWorkspace.reportDocument.download.filePath));
    return true;
  }

  const documentMatch = url.pathname.match(/^\/rejection-check\/(tender-document|bid-document)$/);
  if (request.method === 'POST' && documentMatch) {
    const body = await readBody(request).catch(() => null);
    if (!body || !body.fileName || (!body.content && !body.contentBase64)) {
      sendJson(response, 400, { success: false, message: '文档内容不能为空' });
      return true;
    }

    const key = documentMatch[1] === 'tender-document' ? 'tenderDocument' : 'bidDocument';
    const extension = String(body.extension || '').toLowerCase() || `.${String(body.fileName).split('.').pop() || 'md'}`;
    let uploadedFile = null;
    let content = String(body.content || '');
    let warnings = [];

    if (body.contentBase64) {
      uploadedFile = storeRejectionCheckFile(key, {
        fileName: body.fileName,
        contentBase64: body.contentBase64,
        mimeType: body.mimeType,
      });

      const parser = isTextExtension(extension) ? 'text' : 'docling';
      const parsedResult = parseDocumentFromFile(uploadedFile.filePath, parser);
      content = parsedResult.markdown || content;
      warnings = parsedResult.warnings || [];
    }

    rejectionCheckWorkspace[key] = {
      fileName: String(body.fileName),
      content,
      extension,
      mimeType: String(body.mimeType || uploadedFile?.mimeType || 'text/plain'),
      size: Number(body.size || uploadedFile?.size || 0),
      storage: uploadedFile,
      warnings,
      importedAt: new Date().toISOString(),
      source: 'upload',
    };
    rejectionCheckWorkspace.updatedAt = new Date().toISOString();
    persistRejectionCheckWorkspace();
    sendJson(response, 200, { success: true, data: rejectionCheckWorkspace });
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/rejection-check/extract-items') {
    rejectionCheckWorkspace.extractedItems = extractRejectionItems(rejectionCheckWorkspace.tenderDocument?.content || '');
    rejectionCheckWorkspace.updatedAt = new Date().toISOString();
    persistRejectionCheckWorkspace();
    sendJson(response, 200, { success: true, data: rejectionCheckWorkspace });
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/rejection-check/run') {
    rejectionCheckWorkspace.checkResult = buildReviewedResult();
    rejectionCheckWorkspace.updatedAt = new Date().toISOString();
    persistRejectionCheckWorkspace();
    sendJson(response, 200, { success: true, data: rejectionCheckWorkspace });
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/rejection-check/review') {
    const body = await readBody(request).catch(() => null);
    if (!body || !body.type || !body.id) {
      sendJson(response, 400, { success: false, message: '缺少检查项标识' });
      return true;
    }

    if (!rejectionCheckWorkspace.reviewStates) {
      rejectionCheckWorkspace.reviewStates = {};
    }

    rejectionCheckWorkspace.reviewStates[`${body.type}:${body.id}`] = {
      status: body.status === 'resolved' ? 'resolved' : 'pending',
      note: String(body.note || ''),
      updatedAt: new Date().toISOString(),
    };

    if (rejectionCheckWorkspace.checkResult) {
      rejectionCheckWorkspace.checkResult = buildReviewedResult();
    }

    rejectionCheckWorkspace.updatedAt = new Date().toISOString();
    persistRejectionCheckWorkspace();
    sendJson(response, 200, { success: true, data: rejectionCheckWorkspace });
    return true;
  }

  return false;
}

module.exports = {
  handleRejectionChecks,
};
