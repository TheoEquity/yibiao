const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const exportDirectory = path.resolve(__dirname, '../../data/exports');
const scriptPath = path.resolve(__dirname, '../../../worker/export_docx.py');

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function sanitizeBaseName(fileName) {
  const baseName = path.basename(String(fileName || 'technical-plan')).replace(/\.[^.]+$/, '');
  return (baseName.trim() || 'technical-plan').replace(/[^a-zA-Z0-9._-\u4e00-\u9fa5]/g, '_');
}

function buildExportBaseName(technicalPlan) {
  const projectName = String(technicalPlan.exportMetadata?.projectName || '').trim();
  const bidderName = String(technicalPlan.exportMetadata?.bidderName || '').trim();
  const baseTitle = projectName || technicalPlan.title || '技术方案';
  const suffix = bidderName ? `${baseTitle}-${bidderName}-技术方案` : `${baseTitle}-技术方案`;
  return sanitizeBaseName(suffix);
}

function buildMarkdownContent(technicalPlan) {
  const title = technicalPlan.title || '未命名技术方案';
  const chapters = technicalPlan.generatedContent?.chapters || [];
  const outlineSections = technicalPlan.generatedOutline?.sections || [];
  const knowledgeReferences = Array.isArray(technicalPlan.knowledgeReferences) ? technicalPlan.knowledgeReferences : [];
  const lines = [
    `# ${title}`,
    '',
    `导出时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`,
    '',
  ];

  if (outlineSections.length > 0) {
    lines.push('## 目录摘要');
    lines.push('');
    for (const section of outlineSections) {
      lines.push(`- ${section.title}`);
      for (const child of section.children || []) {
        lines.push(`  - ${child.title}`);
      }
    }
    lines.push('');
  }

  if (knowledgeReferences.length > 0) {
    lines.push('## 知识库引用摘要');
    lines.push('');
    for (const reference of knowledgeReferences) {
      lines.push(`- ${reference.title}`);
    }
    lines.push('');
  }

  for (const chapter of chapters) {
    lines.push(`## ${chapter.title}`);
    lines.push('');
    if (chapter.summary) {
      lines.push(`章节摘要：${chapter.summary}`);
      lines.push('');
    }
    if (chapter.generatedAt || chapter.updatedAt) {
      lines.push(`章节生成时间：${chapter.generatedAt || '未记录'}`);
      lines.push(`章节更新时间：${chapter.updatedAt || chapter.generatedAt || '未记录'}`);
      lines.push('');
    }
    if (Array.isArray(chapter.references) && chapter.references.length > 0) {
      lines.push(`参考条目：${chapter.references.map((reference) => reference.title).join('、')}`);
      lines.push('');
    }
    lines.push(chapter.content || '');
    lines.push('');
  }

  return lines.join('\n');
}

function exportTechnicalPlanToDocx(technicalPlan) {
  const title = technicalPlan.title || '未命名技术方案';
  const safeBaseName = buildExportBaseName(technicalPlan);
  const technicalPlanDirectory = path.join(exportDirectory, technicalPlan.id || 'default');
  ensureDirectory(technicalPlanDirectory);

  const markdownFileName = `${safeBaseName}.md`;
  const docxFileName = `${safeBaseName}.docx`;
  const markdownFilePath = path.join(technicalPlanDirectory, markdownFileName);
  const docxFilePath = path.join(technicalPlanDirectory, docxFileName);
  const markdownContent = buildMarkdownContent(technicalPlan);

  fs.writeFileSync(markdownFilePath, markdownContent, 'utf-8');

  const exportPayload = {
    title,
    generatedAt: new Date().toISOString(),
    exportMetadata: technicalPlan.exportMetadata || {},
    outlineSections: technicalPlan.generatedOutline?.sections || [],
    knowledgeReferences: Array.isArray(technicalPlan.knowledgeReferences) ? technicalPlan.knowledgeReferences : [],
    chapters: technicalPlan.generatedContent?.chapters || [],
  };

  const result = spawnSync('python3', [scriptPath, docxFilePath], {
    cwd: path.resolve(__dirname, '../..'),
    input: JSON.stringify(exportPayload),
    encoding: 'utf-8',
    timeout: 120000,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || 'DOCX 导出失败');
  }

  return {
    format: 'docx',
    fileName: docxFileName,
    summary: exportPayload.knowledgeReferences.length > 0
      ? `已导出 ${exportPayload.chapters.length} 个章节，生成 DOCX 文件并附带 ${exportPayload.knowledgeReferences.length} 条知识库引用摘要。`
      : `已导出 ${exportPayload.chapters.length} 个章节，生成 DOCX 文件。`,
    generatedAt: exportPayload.generatedAt,
    content: markdownContent,
    download: {
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filePath: docxFilePath,
    },
    markdown: {
      fileName: markdownFileName,
      filePath: markdownFilePath,
      mimeType: 'text/markdown; charset=utf-8',
    },
  };
}

module.exports = {
  buildMarkdownContent,
  exportTechnicalPlanToDocx,
};
