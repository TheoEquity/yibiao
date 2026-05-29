const path = require('node:path');
const { createJsonStore } = require('./jsonStore');

const technicalPlansFilePath = path.resolve(__dirname, '../../data/technical-plans.json');

const defaultTechnicalPlans = [
  {
    id: 'tp-demo-001',
    title: '演示技术方案工作区',
    status: 'draft',
    currentStep: 'document-analysis',
    tenderFile: null,
    parsedDocument: null,
    bidAnalysis: null,
    knowledgeReferences: [],
    exportMetadata: {
      projectName: '',
      bidReferenceNo: '',
      bidderName: '',
    },
    generatedOutline: null,
    generatedContent: null,
    exportedDocument: null,
    recentTaskSummaries: [],
    updatedAt: new Date().toISOString(),
  },
];

function normalizeTechnicalPlan(technicalPlan) {
  return {
    status: 'draft',
    currentStep: 'document-analysis',
    tenderFile: null,
    parsedDocument: null,
    bidAnalysis: null,
    knowledgeReferences: [],
    generatedOutline: null,
    generatedContent: null,
    exportedDocument: null,
    recentTaskSummaries: [],
    updatedAt: new Date().toISOString(),
    ...technicalPlan,
  };
}

const store = createJsonStore('technical-plans.json', defaultTechnicalPlans, {
  key: 'technical-plans',
});

function loadTechnicalPlans() {
  const parsed = store.read();
  return Array.isArray(parsed)
    ? parsed.map((item) => normalizeTechnicalPlan(item))
    : [...defaultTechnicalPlans];
}

function saveTechnicalPlans(technicalPlans) {
  store.write(technicalPlans);
  store.exportToLegacyJson(technicalPlans);
}

module.exports = {
  loadTechnicalPlans,
  saveTechnicalPlans,
  technicalPlansFilePath,
};
