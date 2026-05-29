const { createJsonStore } = require('./jsonStore');

const store = createJsonStore('parsed-documents.json', [], {
  key: 'parsed-documents',
});

const parsedDocuments = store.read();

function persistParsedDocuments() {
  store.write(parsedDocuments);
  store.exportToLegacyJson(parsedDocuments);
}

function createParsedDocument({ fileName, extension, parser, markdown, plainText, warnings = [], outline, tables, assets, metadata }) {
  const parsedDocument = {
    id: `pd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    markdown,
    plainText,
    outline: Array.isArray(outline) && outline.length > 0
      ? outline
      : markdown
        .split('\n')
        .filter((line) => line.startsWith('#'))
        .map((line) => ({
          level: line.match(/^#+/)?.[0].length || 1,
          title: line.replace(/^#+\s*/, '').trim(),
        })),
    tables: Array.isArray(tables) ? tables : [],
    assets: Array.isArray(assets) ? assets : [],
    metadata: {
      fileName,
      extension,
      parser,
      hasOcr: false,
      ...metadata,
    },
    warnings,
    createdAt: new Date().toISOString(),
  };

  parsedDocuments.unshift(parsedDocument);
  persistParsedDocuments();
  return parsedDocument;
}

module.exports = {
  parsedDocuments,
  createParsedDocument,
  persistParsedDocuments,
};
