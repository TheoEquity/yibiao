const { createJsonStore } = require('./jsonStore');

const store = createJsonStore('rejection-checks.json', {
  tenderDocument: null,
  bidDocument: null,
  extractedItems: null,
  checkResult: null,
  reportDocument: null,
  reviewStates: {},
  updatedAt: new Date().toISOString(),
}, {
  key: 'rejection-checks',
});

const rejectionCheckWorkspace = store.read();

function persistRejectionCheckWorkspace() {
  store.write(rejectionCheckWorkspace);
  store.exportToLegacyJson(rejectionCheckWorkspace);
}

module.exports = {
  rejectionCheckWorkspace,
  persistRejectionCheckWorkspace,
};
