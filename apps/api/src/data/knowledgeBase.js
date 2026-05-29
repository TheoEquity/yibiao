const { createJsonStore } = require('./jsonStore');

const store = createJsonStore('knowledge-base.json', {
  folders: [
    {
      id: 'kb-folder-demo',
      name: '默认知识库',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  documents: [],
  items: {},
}, {
  key: 'knowledge-base',
});

const knowledgeBase = store.read();

function persistKnowledgeBase() {
  store.write(knowledgeBase);
  store.exportToLegacyJson(knowledgeBase);
}

module.exports = {
  knowledgeBase,
  persistKnowledgeBase,
};
