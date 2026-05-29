const { createJsonStore } = require('./jsonStore');

const store = createJsonStore('duplicate-checks.json', {
  tenderFile: null,
  bidFiles: [],
  analysis: null,
  reportDocument: null,
  updatedAt: new Date().toISOString(),
}, {
  key: 'duplicate-checks',
});

const duplicateCheckWorkspace = store.read();

function persistDuplicateCheckWorkspace() {
  store.write(duplicateCheckWorkspace);
  store.exportToLegacyJson(duplicateCheckWorkspace);
}

module.exports = {
  duplicateCheckWorkspace,
  persistDuplicateCheckWorkspace,
};
