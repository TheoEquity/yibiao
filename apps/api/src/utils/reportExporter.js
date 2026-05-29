const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const exportDirectory = path.resolve(__dirname, '../../data/exports');
const scriptPath = path.resolve(__dirname, '../../../worker/export_report_docx.py');

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function sanitizeBaseName(fileName) {
  const baseName = path.basename(String(fileName || 'report')).replace(/\.[^.]+$/, '');
  return (baseName.trim() || 'report').replace(/[^a-zA-Z0-9._-\u4e00-\u9fa5]/g, '_');
}

function exportGenericReport(reportId, baseName, payload) {
  const safeBaseName = sanitizeBaseName(baseName);
  const reportDirectory = path.join(exportDirectory, reportId);
  ensureDirectory(reportDirectory);

  const fileName = `${safeBaseName}.docx`;
  const filePath = path.join(reportDirectory, fileName);

  const result = spawnSync('python3', [scriptPath, filePath], {
    cwd: path.resolve(__dirname, '../..'),
    input: JSON.stringify(payload),
    encoding: 'utf-8',
    timeout: 120000,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || '报告导出失败');
  }

  return {
    format: 'docx',
    fileName,
    generatedAt: new Date().toISOString(),
    download: {
      filePath,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
  };
}

function buildDuplicateCheckReport(workspace) {
  const analysis = workspace.analysis || {};
  const report = exportGenericReport('duplicate-check-report', '标书查重报告', {
    title: '标书查重报告',
    summary: analysis.summary || '暂无查重结果。',
    sections: [
      {
        heading: '文件概况',
        table: {
          headers: ['项目', '内容'],
          rows: [
            ['招标文件', workspace.tenderFile?.fileName || '未上传'],
            ['投标文件数', String((workspace.bidFiles || []).length)],
            ['目录一致', analysis.metadata?.sameOutline ? '是' : '否'],
            ['高风险文件对', String(analysis.metadata?.highRiskPairs || 0)],
          ],
        },
      },
      {
        heading: '风险项',
        items: (analysis.risks || []).map((risk) => ({
          title: `${risk.title} [${risk.severity}]`,
          lines: [
            risk.detail || '',
            ...(risk.evidence || []).map((item) => `${item.fileName}: ${item.excerpt}`),
          ].filter(Boolean),
        })),
      },
      {
        heading: '文件对照强度',
        items: (analysis.pairComparisons || []).map((pair) => ({
          title: `${pair.files.join(' vs ')} [${pair.severity}]`,
          lines: [
            `重复段落数：${pair.repeatedCount}`,
            `段落相似度：${pair.similarityScore || 0}`,
            `目录重合度：${pair.outlineScore || 0}`,
            ...pair.examples,
          ],
        })),
      },
    ],
  });

  return {
    ...report,
    summary: analysis.summary || '已生成标书查重报告。',
  };
}

function buildRejectionCheckReport(workspace) {
  const result = workspace.checkResult || {};
  const report = exportGenericReport('rejection-check-report', '废标项检查报告', {
    title: '废标项检查报告',
    summary: '已汇总废标项、错别字和逻辑问题检查结果。',
    sections: [
      {
        heading: '文档概况',
        table: {
          headers: ['项目', '内容'],
          rows: [
            ['招标文件', workspace.tenderDocument?.fileName || '未上传'],
            ['投标文件', workspace.bidDocument?.fileName || '未上传'],
            ['提取废标项数', String((workspace.extractedItems || []).length)],
            ['废标风险数', String((result.rejection?.findings || []).length)],
          ],
        },
      },
      {
        heading: '废标项风险',
        items: (result.rejection?.findings || []).map((item) => ({
          title: `${item.title} [${item.severity || 'medium'}]`,
          lines: [
            item.summary || '',
            item.requirement ? `招标要求：${item.requirement}` : '',
            item.bidEvidence ? `投标证据：${item.bidEvidence}` : '',
            item.riskReason ? `风险原因：${item.riskReason}` : '',
            item.suggestion ? `建议动作：${item.suggestion}` : '',
            item.review ? `处理状态：${item.review.status} ${item.review.note || ''}` : '',
          ].filter(Boolean),
        })),
      },
      {
        heading: '错别字问题',
        items: (result.typo?.findings || []).map((item) => ({
          title: item.wrongText,
          lines: [
            item.correctText ? `建议改为：${item.correctText}` : '',
            item.originalExcerpt ? `原文片段：${item.originalExcerpt}` : '',
            item.reason ? `原因：${item.reason}` : '',
            item.review ? `处理状态：${item.review.status} ${item.review.note || ''}` : '',
          ].filter(Boolean),
        })),
      },
      {
        heading: '逻辑问题',
        items: (result.logic?.findings || []).map((item) => ({
          title: item.title,
          lines: [
            item.originalText ? `原问题：${item.originalText}` : '',
            item.fallacyReason ? `问题原因：${item.fallacyReason}` : '',
            item.suggestion ? `建议动作：${item.suggestion}` : '',
            item.review ? `处理状态：${item.review.status} ${item.review.note || ''}` : '',
          ].filter(Boolean),
        })),
      },
    ],
  });

  return {
    ...report,
    summary: '已生成废标项检查报告。',
  };
}

module.exports = {
  buildDuplicateCheckReport,
  buildRejectionCheckReport,
};
