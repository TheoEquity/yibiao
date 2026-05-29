const { loadTechnicalPlans, saveTechnicalPlans } = require('./technicalPlanStore');

const technicalPlans = loadTechnicalPlans();

function persistTechnicalPlans() {
  saveTechnicalPlans(technicalPlans);
}

module.exports = {
  technicalPlans,
  persistTechnicalPlans,
};
