const http = require('node:http');
const { URL } = require('node:url');
const { handleTechnicalPlans } = require('./routes/technicalPlans');
const { handleTasks } = require('./routes/tasks');
const { handleParsedDocuments } = require('./routes/parsedDocuments');
const { handleKnowledgeBase } = require('./routes/knowledgeBase');
const { handleDuplicateChecks } = require('./routes/duplicateChecks');
const { handleRejectionChecks } = require('./routes/rejectionChecks');
const { handleSettings } = require('./routes/settings');
const { bootstrapState } = require('./data/bootstrapState');

const port = Number(process.env.PORT || 3001);

bootstrapState();

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);

  const finish = (statusCode, payload) => {
    response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(payload));
  };

  if (url.pathname === '/health') {
    finish(200, { success: true, service: 'api', status: 'ok' });
    return;
  }

  handleTechnicalPlans(request, response, url)
    .then((handled) => {
      if (handled) {
        return;
      }

      return handleTasks(request, response, url).then((taskHandled) => {
        if (taskHandled) {
          return;
        }

        return handleParsedDocuments(request, response, url).then((parsedHandled) => {
          if (parsedHandled) {
            return;
          }

          return handleKnowledgeBase(request, response, url).then((knowledgeHandled) => {
            if (knowledgeHandled) {
              return;
            }

            return handleDuplicateChecks(request, response, url).then((duplicateHandled) => {
              if (duplicateHandled) {
                return;
              }

              return handleRejectionChecks(request, response, url).then((rejectionHandled) => {
                if (rejectionHandled) {
                  return;
                }

                return handleSettings(request, response, url).then((settingsHandled) => {
                  if (settingsHandled) {
                    return;
                  }

                  finish(200, {
                    success: true,
                    service: 'api',
                    message: '易标 Web API 骨架已初始化',
                  });
                });
              });
            });
          });
        });
      });
    })
    .catch((error) => {
      finish(500, {
        success: false,
        message: error.message || '服务异常',
      });
    });
});

server.listen(port, () => {
  console.log(`[api] listening on http://127.0.0.1:${port}`);
});
