const { syncDatabaseToLegacyJson } = require('./jsonStore');

function bootstrapState() {
  syncDatabaseToLegacyJson('technical-plans.json', 'technical-plans');
  syncDatabaseToLegacyJson('tasks.json', 'tasks');
  syncDatabaseToLegacyJson('parsed-documents.json', 'parsed-documents');
  syncDatabaseToLegacyJson('knowledge-base.json', 'knowledge-base');
  syncDatabaseToLegacyJson('duplicate-checks.json', 'duplicate-checks');
  syncDatabaseToLegacyJson('rejection-checks.json', 'rejection-checks');
  syncDatabaseToLegacyJson('settings.json', 'settings');
}

module.exports = {
  bootstrapState,
};
