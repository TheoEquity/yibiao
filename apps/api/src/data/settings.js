const { createJsonStore } = require('./jsonStore');

const defaultSettings = {
  textModel: {
    provider: 'jinlong',
    api_key: '',
    base_url: 'https://jlaudeapi.com/v1',
    model_name: 'gpt-4o-mini',
  },
  imageModel: {
    provider: 'google-ai-studio',
    api_key: '',
    base_url: 'https://generativelanguage.googleapis.com/v1beta',
    model_name: 'gemini-3.1-flash-image-preview',
    status: 'untested',
  },
  fileParser: {
    provider: 'docling',
    keepImages: true,
    fallbackProvider: 'local-text',
  },
  general: {
    developer_mode: false,
    real_time_render: true,
  },
  updatedAt: new Date().toISOString(),
};

const store = createJsonStore('settings.json', defaultSettings, {
  key: 'settings',
});
const settingsState = store.read();

function persistSettingsState() {
  store.write(settingsState);
  store.exportToLegacyJson(settingsState);
}

module.exports = {
  settingsState,
  persistSettingsState,
};
