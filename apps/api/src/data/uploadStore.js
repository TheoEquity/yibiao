const fs = require('node:fs');
const path = require('node:path');

const uploadsDirectory = path.resolve(__dirname, '../../data/uploads');

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function sanitizeFileName(fileName) {
  const baseName = path.basename(String(fileName || 'upload.bin')).trim() || 'upload.bin';
  return baseName.replace(/[^a-zA-Z0-9._-\u4e00-\u9fa5]/g, '_');
}

function storeTechnicalPlanFile(technicalPlanId, payload) {
  const safeFileName = sanitizeFileName(payload.fileName);
  const technicalPlanDirectory = path.join(uploadsDirectory, 'technical-plans', technicalPlanId);
  ensureDirectory(technicalPlanDirectory);

  const storedFileName = `${Date.now()}-${safeFileName}`;
  const absolutePath = path.join(technicalPlanDirectory, storedFileName);
  const fileBuffer = Buffer.from(String(payload.contentBase64 || ''), 'base64');
  fs.writeFileSync(absolutePath, fileBuffer);

  return {
    fileName: safeFileName,
    storedFileName,
    filePath: absolutePath,
    size: fileBuffer.byteLength,
    mimeType: String(payload.mimeType || 'application/octet-stream'),
    uploadedAt: new Date().toISOString(),
  };
}

function storeKnowledgeBaseFile(documentId, payload) {
  const safeFileName = sanitizeFileName(payload.fileName);
  const documentDirectory = path.join(uploadsDirectory, 'knowledge-base', documentId);
  ensureDirectory(documentDirectory);

  const storedFileName = `${Date.now()}-${safeFileName}`;
  const absolutePath = path.join(documentDirectory, storedFileName);
  const fileBuffer = Buffer.from(String(payload.contentBase64 || ''), 'base64');
  fs.writeFileSync(absolutePath, fileBuffer);

  return {
    fileName: safeFileName,
    storedFileName,
    filePath: absolutePath,
    size: fileBuffer.byteLength,
    mimeType: String(payload.mimeType || 'application/octet-stream'),
    uploadedAt: new Date().toISOString(),
  };
}

function storeRejectionCheckFile(documentType, payload) {
  const safeFileName = sanitizeFileName(payload.fileName);
  const documentDirectory = path.join(uploadsDirectory, 'rejection-check', documentType);
  ensureDirectory(documentDirectory);

  const storedFileName = `${Date.now()}-${safeFileName}`;
  const absolutePath = path.join(documentDirectory, storedFileName);
  const fileBuffer = Buffer.from(String(payload.contentBase64 || ''), 'base64');
  fs.writeFileSync(absolutePath, fileBuffer);

  return {
    fileName: safeFileName,
    storedFileName,
    filePath: absolutePath,
    size: fileBuffer.byteLength,
    mimeType: String(payload.mimeType || 'application/octet-stream'),
    uploadedAt: new Date().toISOString(),
  };
}

function storeDuplicateCheckFile(documentType, payload) {
  const safeFileName = sanitizeFileName(payload.fileName);
  const documentDirectory = path.join(uploadsDirectory, 'duplicate-check', documentType);
  ensureDirectory(documentDirectory);

  const storedFileName = `${Date.now()}-${safeFileName}`;
  const absolutePath = path.join(documentDirectory, storedFileName);
  const fileBuffer = Buffer.from(String(payload.contentBase64 || ''), 'base64');
  fs.writeFileSync(absolutePath, fileBuffer);

  return {
    fileName: safeFileName,
    storedFileName,
    filePath: absolutePath,
    size: fileBuffer.byteLength,
    mimeType: String(payload.mimeType || 'application/octet-stream'),
    uploadedAt: new Date().toISOString(),
  };
}

module.exports = {
  storeDuplicateCheckFile,
  storeKnowledgeBaseFile,
  storeRejectionCheckFile,
  storeTechnicalPlanFile,
};
