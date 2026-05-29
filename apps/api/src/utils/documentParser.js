const path = require('node:path');
const { spawnSync } = require('node:child_process');

const workerScriptPath = path.resolve(__dirname, '../../../worker/document_parse_task.py');

function parseDocumentFromFile(filePath, parser = 'docling') {
  const result = spawnSync('python3', [workerScriptPath, filePath, parser], {
    encoding: 'utf-8',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || '文档解析失败');
  }

  const payload = JSON.parse(result.stdout);
  return payload.data;
}

module.exports = {
  parseDocumentFromFile,
};
