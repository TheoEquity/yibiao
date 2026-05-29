const { duplicateCheckWorkspace, persistDuplicateCheckWorkspace } = require('../data/duplicateChecks');
const { storeDuplicateCheckFile } = require('../data/uploadStore');
const { parseDocumentFromFile } = require('../utils/documentParser');
const { buildDuplicateCheckReport } = require('../utils/reportExporter');
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

function extractHeadings(markdown) {
  return String(markdown || '').split('\n').filter((line) => /^#+\s+/.test(line)).map((line) => line.replace(/^#+\s+/, '').trim());
}

function normalizeText(text) {
  return String(text || '').toLowerCase().replace(/[^\p{L}\p{N}\u4e00-\u9fa5]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(text) {
  return normalizeText(text).split(' ').filter((item) => item.length >= 2);
}

function computeSimilarity(left, right) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let intersect = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersect += 1;
    }
  }

  return intersect / new Set([...leftTokens, ...rightTokens]).size;
}

function analyzeDuplicateCheck() {
  const bidFiles = duplicateCheckWorkspace.bidFiles || [];
  const contentMap = new Map();
  const pairMap = new Map();
  const fileParagraphs = bidFiles.map((file) => ({
    fileName: file.fileName,
    headings: extractHeadings(file.content),
    paragraphs: String(file.content || '').split(/\n\s*\n/).map((item) => item.trim()).filter((item) => item.length > 12),
  }));

  for (const file of fileParagraphs) {
    const paragraphs = file.paragraphs;
    for (const paragraph of paragraphs) {
      const normalized = normalizeText(paragraph);
      const list = contentMap.get(normalized) || [];
      list.push(file.fileName);
      contentMap.set(normalized, list);
    }
  }

  const repeatedParagraphs = [...contentMap.entries()]
    .filter(([, files]) => files.length > 1)
    .slice(0, 8)
    .map(([paragraph, files], index) => {
      for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
        for (let compareIndex = fileIndex + 1; compareIndex < files.length; compareIndex += 1) {
          const left = files[fileIndex];
          const right = files[compareIndex];
          const pairKey = [left, right].sort().join('||');
          const current = pairMap.get(pairKey) || {
            pairKey,
            files: [left, right].sort(),
            repeatedCount: 0,
            examples: [],
            matches: [],
          };

          current.repeatedCount += 1;
          if (current.examples.length < 2) {
            current.examples.push(paragraph.slice(0, 120));
          }
          if (current.matches.length < 4) {
            current.matches.push({
              id: `${pairKey}-${current.repeatedCount}`,
              leftFileName: current.files[0],
              rightFileName: current.files[1],
              leftExcerpt: paragraph.slice(0, 220),
              rightExcerpt: paragraph.slice(0, 220),
            });
          }
          pairMap.set(pairKey, current);
        }
      }

      const evidence = files.map((fileName) => ({
        fileName,
        excerpt: paragraph.slice(0, 160),
      }));

      return {
        id: `duplicate-risk-${index + 1}`,
        title: `重复段落 ${index + 1}`,
        severity: files.length >= 3 ? 'high' : 'medium',
        detail: `${files.join('、')} 中存在相同段落：${paragraph.slice(0, 120)}`,
        paragraph,
        files,
        evidence,
      };
    });

  for (let leftIndex = 0; leftIndex < fileParagraphs.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < fileParagraphs.length; rightIndex += 1) {
      const left = fileParagraphs[leftIndex];
      const right = fileParagraphs[rightIndex];
      const pairKey = [left.fileName, right.fileName].sort().join('||');
      const current = pairMap.get(pairKey) || {
        pairKey,
        files: [left.fileName, right.fileName].sort(),
        repeatedCount: 0,
        examples: [],
        matches: [],
        similarityScore: 0,
        outlineScore: 0,
      };

      const matches = [];
      for (const leftParagraph of left.paragraphs.slice(0, 24)) {
        let bestMatch = null;
        let bestScore = 0;
        for (const rightParagraph of right.paragraphs.slice(0, 24)) {
          const score = computeSimilarity(leftParagraph, rightParagraph);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = rightParagraph;
          }
        }

        if (bestMatch && bestScore >= 0.55) {
          matches.push({ leftParagraph, rightParagraph: bestMatch, score: bestScore });
        }
      }

      const leftHeadingSet = new Set(left.headings);
      const rightHeadingSet = new Set(right.headings);
      const sameHeadings = [...leftHeadingSet].filter((heading) => rightHeadingSet.has(heading)).length;
      const outlineScore = leftHeadingSet.size || rightHeadingSet.size
        ? sameHeadings / new Set([...leftHeadingSet, ...rightHeadingSet]).size
        : 0;

      if (matches.length > 0 || outlineScore > 0) {
        current.repeatedCount = Math.max(current.repeatedCount, matches.length);
        current.examples = matches.slice(0, 2).map((item) => item.leftParagraph.slice(0, 120));
        current.matches = matches.slice(0, 4).map((item, index) => ({
          id: `${pairKey}-similar-${index + 1}`,
          leftFileName: left.fileName,
          rightFileName: right.fileName,
          leftExcerpt: item.leftParagraph.slice(0, 220),
          rightExcerpt: item.rightParagraph.slice(0, 220),
          similarity: Number(item.score.toFixed(2)),
        }));
        current.similarityScore = matches.length > 0 ? matches.reduce((sum, item) => sum + item.score, 0) / matches.length : 0;
        current.outlineScore = outlineScore;
        pairMap.set(pairKey, current);
      }
    }
  }

  const outlineGroups = fileParagraphs.map((file) => ({
    fileName: file.fileName,
    headings: file.headings,
  }));

  const sameOutline = outlineGroups.length >= 2
    ? outlineGroups.every((group) => group.headings.join('|') === outlineGroups[0].headings.join('|'))
    : false;

  const pairComparisons = [...pairMap.values()]
    .sort((left, right) => right.repeatedCount - left.repeatedCount)
    .map((pair, index) => ({
      id: `duplicate-pair-${index + 1}`,
      files: pair.files,
      repeatedCount: pair.repeatedCount,
      severity: pair.repeatedCount >= 4 || pair.outlineScore >= 0.8 ? 'high' : pair.repeatedCount >= 2 || pair.outlineScore >= 0.5 ? 'medium' : 'low',
      examples: pair.examples,
      matches: pair.matches,
      similarityScore: Number((pair.similarityScore || 0).toFixed(2)),
      outlineScore: Number((pair.outlineScore || 0).toFixed(2)),
    }));

  return {
    summary: pairComparisons.length > 0
      ? `已形成 ${pairComparisons.length} 组重点对照结果，建议优先复核高相似段落和高重合目录。`
      : '当前未发现明显的高相似内容，可以继续做人工抽样复核。',
    risks: repeatedParagraphs,
    metadata: {
      totalFiles: bidFiles.length,
      sameOutline,
      tenderReferenced: Boolean(duplicateCheckWorkspace.tenderFile),
      highRiskPairs: pairComparisons.filter((item) => item.severity === 'high').length,
    },
    outlinePairs: outlineGroups,
    pairComparisons,
    updatedAt: new Date().toISOString(),
  };
}

async function handleDuplicateChecks(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/duplicate-check') {
    sendJson(response, 200, { success: true, data: duplicateCheckWorkspace });
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/duplicate-check/export-report') {
    duplicateCheckWorkspace.reportDocument = buildDuplicateCheckReport(duplicateCheckWorkspace);
    duplicateCheckWorkspace.updatedAt = new Date().toISOString();
    persistDuplicateCheckWorkspace();
    sendJson(response, 200, { success: true, data: duplicateCheckWorkspace.reportDocument });
    return true;
  }

  if (request.method === 'GET' && url.pathname === '/duplicate-check/report-document') {
    if (!duplicateCheckWorkspace.reportDocument?.download?.filePath || !fs.existsSync(duplicateCheckWorkspace.reportDocument.download.filePath)) {
      sendJson(response, 404, { success: false, message: '查重报告不存在，请先导出' });
      return true;
    }

    response.writeHead(200, {
      'Content-Type': duplicateCheckWorkspace.reportDocument.download.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(duplicateCheckWorkspace.reportDocument.fileName)}"`,
    });
    response.end(fs.readFileSync(duplicateCheckWorkspace.reportDocument.download.filePath));
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/duplicate-check/tender-file') {
    const body = await readBody(request).catch(() => null);
    if (!body || !body.fileName || (!body.content && !body.contentBase64)) {
      sendJson(response, 400, { success: false, message: '招标文件内容不能为空' });
      return true;
    }

    const extension = String(body.extension || '').toLowerCase() || `.${String(body.fileName).split('.').pop() || 'md'}`;
    let uploadedFile = null;
    let content = String(body.content || '');
    let warnings = [];

    if (body.contentBase64) {
      uploadedFile = storeDuplicateCheckFile('tender-file', {
        fileName: body.fileName,
        contentBase64: body.contentBase64,
        mimeType: body.mimeType,
      });

      const parser = isTextExtension(extension) ? 'text' : 'docling';
      const parsedResult = parseDocumentFromFile(uploadedFile.filePath, parser);
      content = parsedResult.markdown || content;
      warnings = parsedResult.warnings || [];
    }

    duplicateCheckWorkspace.tenderFile = {
      id: 'duplicate-tender-file',
      fileName: String(body.fileName),
      content,
      extension,
      mimeType: String(body.mimeType || uploadedFile?.mimeType || 'text/plain'),
      size: Number(body.size || uploadedFile?.size || 0),
      storage: uploadedFile,
      warnings,
      updatedAt: new Date().toISOString(),
    };
    duplicateCheckWorkspace.updatedAt = new Date().toISOString();
    persistDuplicateCheckWorkspace();
    sendJson(response, 200, { success: true, data: duplicateCheckWorkspace });
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/duplicate-check/bid-files') {
    const body = await readBody(request).catch(() => null);
    if (!body || !body.fileName || (!body.content && !body.contentBase64)) {
      sendJson(response, 400, { success: false, message: '投标文件内容不能为空' });
      return true;
    }

    const extension = String(body.extension || '').toLowerCase() || `.${String(body.fileName).split('.').pop() || 'md'}`;
    let uploadedFile = null;
    let content = String(body.content || '');
    let warnings = [];

    if (body.contentBase64) {
      uploadedFile = storeDuplicateCheckFile('bid-files', {
        fileName: body.fileName,
        contentBase64: body.contentBase64,
        mimeType: body.mimeType,
      });

      const parser = isTextExtension(extension) ? 'text' : 'docling';
      const parsedResult = parseDocumentFromFile(uploadedFile.filePath, parser);
      content = parsedResult.markdown || content;
      warnings = parsedResult.warnings || [];
    }

    duplicateCheckWorkspace.bidFiles.push({
      id: `duplicate-bid-${Date.now()}`,
      fileName: String(body.fileName),
      content,
      extension,
      mimeType: String(body.mimeType || uploadedFile?.mimeType || 'text/plain'),
      size: Number(body.size || uploadedFile?.size || 0),
      storage: uploadedFile,
      warnings,
      updatedAt: new Date().toISOString(),
    });
    duplicateCheckWorkspace.updatedAt = new Date().toISOString();
    persistDuplicateCheckWorkspace();
    sendJson(response, 201, { success: true, data: duplicateCheckWorkspace });
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/duplicate-check/run') {
    duplicateCheckWorkspace.analysis = analyzeDuplicateCheck();
    duplicateCheckWorkspace.updatedAt = new Date().toISOString();
    persistDuplicateCheckWorkspace();
    sendJson(response, 200, { success: true, data: duplicateCheckWorkspace });
    return true;
  }

  return false;
}

module.exports = {
  handleDuplicateChecks,
};
