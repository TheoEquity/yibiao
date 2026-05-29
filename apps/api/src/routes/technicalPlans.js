const { technicalPlans, persistTechnicalPlans } = require('../data/technicalPlans');
const { createTask, updateTask } = require('../data/tasks');
const { createParsedDocument } = require('../data/parsedDocuments');
const { storeTechnicalPlanFile } = require('../data/uploadStore');
const { parseDocumentFromFile } = require('../utils/documentParser');
const { callTextModel } = require('../utils/textModel');
const { exportTechnicalPlanToDocx } = require('../utils/docxExporter');
const fs = require('node:fs');

function isTextExtension(extension) {
  return ['.md', '.markdown', '.txt', '.json', '.csv'].includes(String(extension || '').toLowerCase());
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function extractHeadingsFromMarkdown(markdown) {
  return String(markdown || '')
    .split('\n')
    .filter((line) => line.startsWith('#'))
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .filter(Boolean);
}

function extractParagraphs(markdown) {
  return String(markdown || '')
    .split(/\n\s*\n/)
    .map((item) => item.replace(/[#>*`-]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((item) => item.length >= 12);
}

function pickParagraphByKeywords(paragraphs, keywords) {
  return paragraphs.find((paragraph) => keywords.some((keyword) => paragraph.includes(keyword))) || '';
}

function buildRequirementClusters(technicalPlan) {
  const parsedDocument = technicalPlan.parsedDocument;
  const headings = parsedDocument?.outline?.map((item) => item.title).filter(Boolean)
    || extractHeadingsFromMarkdown(technicalPlan.tenderFile?.content);
  const paragraphs = extractParagraphs(parsedDocument?.markdown || technicalPlan.tenderFile?.content);

  const clusters = [
    {
      key: 'scope',
      title: '实施范围与项目理解',
      keywords: ['范围', '目标', '建设', '项目', '需求'],
      fallback: headings[0] || '项目背景与建设目标',
    },
    {
      key: 'solution',
      title: '技术方案与架构设计',
      keywords: ['技术', '架构', '系统', '平台', '功能'],
      fallback: headings[1] || '技术架构与功能设计',
    },
    {
      key: 'delivery',
      title: '实施计划与交付保障',
      keywords: ['实施', '交付', '工期', '进度', '验收'],
      fallback: headings[2] || '实施计划与交付安排',
    },
    {
      key: 'service',
      title: '服务承诺与运维支持',
      keywords: ['服务', '运维', '培训', '保障', '售后'],
      fallback: headings[3] || '服务保障与运维支持',
    },
  ];

  return clusters.map((cluster) => ({
    ...cluster,
    matchedHeading: headings.find((heading) => cluster.keywords.some((keyword) => heading.includes(keyword))) || cluster.fallback,
    evidence: pickParagraphByKeywords(paragraphs, cluster.keywords),
  }));
}

function buildBidAnalysis(technicalPlan) {
  const parsedDocument = technicalPlan.parsedDocument;
  const clusters = buildRequirementClusters(technicalPlan);
  const evidenceCount = clusters.filter((item) => item.evidence).length;
  const priorityRequirements = clusters.slice(0, 3).map((item) => item.matchedHeading);
  const missingAreas = clusters.filter((item) => !item.evidence).map((item) => item.title);

  return {
    summary: evidenceCount > 0
      ? `已围绕 ${evidenceCount} 个关键主题提炼招标要求，建议优先完善“${priorityRequirements[0]}”对应的技术响应。`
      : '当前文档有效要求较少，建议先补充项目范围、技术方案和实施要求。',
    priorityRequirements: priorityRequirements.length > 0
      ? priorityRequirements
      : ['补充项目背景', '明确实施范围', '整理交付要求'],
    risks: [
      missingAreas.length > 0 ? `以下主题缺少稳定证据段落：${missingAreas.join('、')}。` : '关键主题均已找到对应证据段落，可继续生成目录。',
      parsedDocument
        ? `已基于 ${parsedDocument.metadata.fileName} 的解析结构生成摘要。`
        : technicalPlan.tenderFile
          ? `已基于 ${technicalPlan.tenderFile.name} 的原始文本结构生成摘要。`
          : '尚未检测到解析文档。',
    ],
    suggestedOutline: clusters.map((item, index) => `${index + 1}. ${item.title}`),
    evidences: clusters.map((item) => ({
      title: item.title,
      matchedHeading: item.matchedHeading,
      evidence: item.evidence || '当前未匹配到直接证据段落。',
    })),
    createdAt: new Date().toISOString(),
  };
}

function buildGeneratedOutline(technicalPlan) {
  const clusters = buildRequirementClusters(technicalPlan);
  const sourceItems = technicalPlan.bidAnalysis?.suggestedOutline?.length
    ? technicalPlan.bidAnalysis.suggestedOutline.map((item) => item.replace(/^\d+\.\s*/, ''))
    : clusters.map((item) => item.title);

  const childTemplates = {
    '实施范围与项目理解': ['招标目标理解', '建设范围响应'],
    '技术方案与架构设计': ['总体架构设计', '核心功能响应'],
    '实施计划与交付保障': ['实施计划安排', '交付与验收保障'],
    '服务承诺与运维支持': ['服务承诺', '运维与培训支持'],
  };

  const sections = (sourceItems.length > 0 ? sourceItems : ['项目理解', '实施方案', '交付保障']).map((title, index) => ({
    id: `outline-${index + 1}`,
    title,
    level: 1,
    children: (childTemplates[title] || [`${title} - 响应要点`, `${title} - 实施说明`]).map((childTitle, childIndex) => ({
      id: `outline-${index + 1}-${childIndex + 1}`,
      title: childTitle,
      level: 2,
    })),
  }));

  return {
    summary: `已基于招标主题生成 ${sections.length} 个一级章节，并补齐实施、交付和服务类子章节。`,
    sections,
    createdAt: new Date().toISOString(),
  };
}

function normalizeOutlineSections(sections) {
  return (Array.isArray(sections) ? sections : []).map((section, index) => ({
    id: String(section.id || `outline-${index + 1}`),
    title: String(section.title || `章节 ${index + 1}`),
    level: Number(section.level || 1),
    children: (Array.isArray(section.children) ? section.children : []).map((child, childIndex) => ({
      id: String(child.id || `outline-${index + 1}-${childIndex + 1}`),
      title: String(child.title || `子章节 ${childIndex + 1}`),
      level: Number(child.level || 2),
    })),
  }));
}

function buildKnowledgeReferenceMap(technicalPlan) {
  const references = Array.isArray(technicalPlan.knowledgeReferences) ? technicalPlan.knowledgeReferences : [];
  return references.map((reference) => ({
    id: String(reference.id || ''),
    documentId: String(reference.documentId || ''),
    itemId: String(reference.itemId || ''),
    title: String(reference.title || '未命名知识条目'),
  })).filter((reference) => reference.documentId && reference.itemId);
}

function tryParseJson(text) {
  const direct = String(text || '').trim();
  const fencedMatch = direct.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : direct;
  return JSON.parse(candidate);
}

function buildBidAnalysisPrompt(technicalPlan) {
  const parsedDocument = technicalPlan.parsedDocument;
  const headings = parsedDocument?.outline?.map((item) => item.title).join('、') || '暂无';
  const paragraphs = extractParagraphs(parsedDocument?.markdown || technicalPlan.tenderFile?.content).slice(0, 12).join('\n');

  return [
    `技术方案标题：${technicalPlan.title || '未命名技术方案'}`,
    `解析标题：${headings}`,
    `招标正文摘录：${paragraphs || '暂无'}`,
    '请输出 JSON，格式为 {"summary":"...","priorityRequirements":["..."],"risks":["..."],"suggestedOutline":["1. ..."],"evidences":[{"title":"...","matchedHeading":"...","evidence":"..."}]}。',
    '要求：围绕招标响应、技术方案、实施计划、服务保障四类主题提炼结果。',
  ].join('\n');
}

async function generateBidAnalysisWithModel(technicalPlan) {
  const responseText = await callTextModel({
    systemPrompt: '你是资深招投标分析专家，请基于招标文档提炼重点要求和技术方案目录建议。',
    userPrompt: buildBidAnalysisPrompt(technicalPlan),
    temperature: 0.3,
  });

  const parsed = tryParseJson(responseText);
  if (!parsed || !Array.isArray(parsed.priorityRequirements) || !Array.isArray(parsed.suggestedOutline)) {
    throw new Error('模型招标分析结果格式不正确');
  }

  return {
    summary: String(parsed.summary || '已完成招标分析。'),
    priorityRequirements: parsed.priorityRequirements.map((item) => String(item)).slice(0, 6),
    risks: Array.isArray(parsed.risks) ? parsed.risks.map((item) => String(item)).slice(0, 6) : [],
    suggestedOutline: parsed.suggestedOutline.map((item) => String(item)).slice(0, 8),
    evidences: Array.isArray(parsed.evidences) ? parsed.evidences.map((item) => ({
      title: String(item.title || '关键主题'),
      matchedHeading: String(item.matchedHeading || item.title || '未匹配标题'),
      evidence: String(item.evidence || '暂无证据摘录'),
    })) : [],
    createdAt: new Date().toISOString(),
    generationMode: 'model',
  };
}

function buildOutlinePrompt(technicalPlan) {
  const bidAnalysis = technicalPlan.bidAnalysis || buildBidAnalysis(technicalPlan);
  return [
    `技术方案标题：${technicalPlan.title || '未命名技术方案'}`,
    `招标分析摘要：${bidAnalysis.summary}`,
    `重点响应项：${(bidAnalysis.priorityRequirements || []).join('、') || '暂无'}`,
    `建议目录：${(bidAnalysis.suggestedOutline || []).join('；') || '暂无'}`,
    `证据摘录：${(bidAnalysis.evidences || []).map((item) => `${item.title}=${item.evidence}`).join('；') || '暂无'}`,
    '请输出 JSON，格式为 {"summary":"...","sections":[{"title":"...","children":["...","..."]}]}。',
    '要求：输出适合技术方案的章节结构，至少包含项目理解、技术方案、实施计划、服务保障等主题。',
  ].join('\n');
}

async function generateOutlineWithModel(technicalPlan) {
  const responseText = await callTextModel({
    systemPrompt: '你是资深投标方案架构专家，请输出结构清晰的技术方案目录。',
    userPrompt: buildOutlinePrompt(technicalPlan),
    temperature: 0.3,
  });

  const parsed = tryParseJson(responseText);
  if (!parsed || !Array.isArray(parsed.sections)) {
    throw new Error('模型目录结果格式不正确');
  }

  return {
    summary: String(parsed.summary || `已生成 ${parsed.sections.length} 个一级章节。`),
    sections: normalizeOutlineSections(parsed.sections.map((section, index) => ({
      id: `outline-${index + 1}`,
      title: String(section.title || `章节 ${index + 1}`),
      level: 1,
      children: (Array.isArray(section.children) ? section.children : []).map((child, childIndex) => ({
        id: `outline-${index + 1}-${childIndex + 1}`,
        title: String(child),
        level: 2,
      })),
    }))),
    createdAt: new Date().toISOString(),
    generationMode: 'model',
  };
}

function buildContentGenerationPrompt(technicalPlan, sections) {
  const evidences = Array.isArray(technicalPlan.bidAnalysis?.evidences) ? technicalPlan.bidAnalysis.evidences : [];
  const knowledgeReferences = buildKnowledgeReferenceMap(technicalPlan);

  return [
    `技术方案标题：${technicalPlan.title || '未命名技术方案'}`,
    `招标分析摘要：${technicalPlan.bidAnalysis?.summary || '暂无'}`,
    `目录结构：${sections.map((section) => `${section.title}（${(section.children || []).map((child) => child.title).join('、')}）`).join('；')}`,
    `招标证据：${evidences.map((item) => `${item.title}=${item.evidence}`).join('；') || '暂无'}`,
    `知识库引用：${knowledgeReferences.map((item) => item.title).join('、') || '暂无'}`,
    '请输出 JSON，格式为 {"summary":"...","chapters":[{"title":"...","summary":"...","content":"..."}]}。',
    '要求：每章内容使用正式投标语气，内容具体，覆盖招标响应、技术措施、实施安排、交付保障，禁止输出 Markdown 代码块。',
  ].join('\n');
}

async function generateContentWithModel(technicalPlan, sections) {
  const responseText = await callTextModel({
    systemPrompt: '你是资深投标方案撰写专家，请基于给定招标信息输出可直接用于技术方案的结构化正文。',
    userPrompt: buildContentGenerationPrompt(technicalPlan, sections),
    temperature: 0.4,
  });

  const parsed = tryParseJson(responseText);
  if (!parsed || !Array.isArray(parsed.chapters)) {
    throw new Error('模型正文结果格式不正确');
  }

  const generatedAt = new Date().toISOString();
  const knowledgeReferences = buildKnowledgeReferenceMap(technicalPlan);

  return {
    summary: String(parsed.summary || `已生成 ${parsed.chapters.length} 个章节正文草稿。`),
    chapters: parsed.chapters.map((chapter, index) => ({
      id: `chapter-${index + 1}`,
      title: String(chapter.title || sections[index]?.title || `章节 ${index + 1}`),
      summary: String(chapter.summary || `本章围绕“${String(chapter.title || sections[index]?.title || `章节 ${index + 1}`)}”展开响应。`),
      content: String(chapter.content || ''),
      references: knowledgeReferences,
      generatedAt,
      updatedAt: generatedAt,
    })),
    createdAt: generatedAt,
    generationMode: 'model',
  };
}

function buildSingleChapterPrompt(technicalPlan, section) {
  const evidences = Array.isArray(technicalPlan.bidAnalysis?.evidences) ? technicalPlan.bidAnalysis.evidences : [];
  const evidence = evidences.find((item) => section.title.includes(item.title) || item.title.includes(section.title));
  const knowledgeReferences = buildKnowledgeReferenceMap(technicalPlan);

  return [
    `技术方案标题：${technicalPlan.title || '未命名技术方案'}`,
    `章节标题：${section.title}`,
    `子章节：${(section.children || []).map((child) => child.title).join('、') || '暂无'}`,
    `招标分析摘要：${technicalPlan.bidAnalysis?.summary || '暂无'}`,
    `招标证据：${evidence?.evidence || '暂无'}`,
    `知识库引用：${knowledgeReferences.map((item) => item.title).join('、') || '暂无'}`,
    '请输出 JSON，格式为 {"summary":"...","content":"..."}。',
    '要求：语气正式，突出招标响应、技术措施、实施安排、交付保障。',
  ].join('\n');
}

async function regenerateChapterWithModel(technicalPlan, section, chapterId, chapterIndex) {
  const responseText = await callTextModel({
    systemPrompt: '你是资深投标方案撰写专家，请为单个章节生成正式且具体的投标正文。',
    userPrompt: buildSingleChapterPrompt(technicalPlan, section),
    temperature: 0.4,
  });

  const parsed = tryParseJson(responseText);
  const generatedAt = new Date().toISOString();

  return {
    id: chapterId,
    title: section.title,
    summary: String(parsed.summary || `本章围绕“${section.title}”展开响应。`),
    content: String(parsed.content || ''),
    references: buildKnowledgeReferenceMap(technicalPlan),
    generatedAt,
    updatedAt: generatedAt,
  };
}

async function rewriteChapterWithModel(chapter, instruction) {
  const responseText = await callTextModel({
    systemPrompt: '你是资深投标方案撰写专家，请在保留章节主题的前提下改写正文。',
    userPrompt: [
      `章节标题：${chapter.title}`,
      `当前摘要：${chapter.summary || '暂无'}`,
      `改写要求：${instruction}`,
      `当前内容：${chapter.content || ''}`,
      '请输出 JSON，格式为 {"summary":"...","content":"..."}。',
    ].join('\n'),
    temperature: 0.4,
  });

  const parsed = tryParseJson(responseText);
  return {
    ...chapter,
    summary: String(parsed.summary || `本章已根据“${instruction}”完成改写。`),
    content: String(parsed.content || chapter.content || ''),
    updatedAt: new Date().toISOString(),
  };
}

function buildGeneratedContent(technicalPlan) {
  const sections = technicalPlan.generatedOutline?.sections?.length
    ? technicalPlan.generatedOutline.sections
    : buildGeneratedOutline(technicalPlan).sections;
  const knowledgeReferences = buildKnowledgeReferenceMap(technicalPlan);
  const knowledgeTitles = knowledgeReferences.map((reference) => reference.title);
  const generatedAt = new Date().toISOString();
  const evidences = Array.isArray(technicalPlan.bidAnalysis?.evidences) ? technicalPlan.bidAnalysis.evidences : [];

  const chapters = sections.map((section, index) => ({
    id: `chapter-${index + 1}`,
    title: section.title,
    content: [
      `${section.title}部分基于当前招标分析、已编辑目录和知识库引用自动生成。`,
      `本章节重点围绕“${section.title}”展开响应，建议先说明招标诉求理解，再给出技术措施与交付承诺。`,
      (() => {
        const evidence = evidences.find((item) => section.title.includes(item.title) || item.title.includes(section.title));
        return evidence ? `招标证据摘录：${evidence.evidence}` : '当前未提取到直接证据摘录，建议人工补充招标原文要点。';
      })(),
      section.children?.length
        ? `建议在本章节内覆盖以下子主题：${section.children.map((child) => child.title).join('、')}。`
        : '当前章节还没有子主题拆分，可在目录编辑阶段继续补充。',
      knowledgeTitles.length > 0
        ? `当前可参考的知识库条目包括：${knowledgeTitles.join('、')}。请结合其中的成熟做法补强实施细节和服务承诺。`
        : '当前还没有选中的知识库条目，正文内容主要基于目录和招标分析生成。',
      `后续可在正文编辑阶段继续补充参数指标、时间计划、人员安排和验收标准等细节。`,
    ].join('\n\n'),
    summary: `本章围绕“${section.title}”组织技术响应，覆盖实施路径、交付保障与重点子主题。`,
    references: knowledgeReferences,
    generatedAt,
    updatedAt: generatedAt,
  }));

  return {
    summary: knowledgeTitles.length > 0
      ? `已生成 ${chapters.length} 个章节正文草稿，并注入 ${knowledgeTitles.length} 条知识库引用。`
      : `已生成 ${chapters.length} 个章节正文草稿，可进入编辑阶段继续润色。`,
    chapters,
    createdAt: new Date().toISOString(),
    generationMode: 'rule',
  };
}

function buildChapterDraft(technicalPlan, section, index) {
  const knowledgeReferences = buildKnowledgeReferenceMap(technicalPlan);
  const knowledgeTitles = knowledgeReferences.map((reference) => reference.title);
  const generatedAt = new Date().toISOString();
  const evidences = Array.isArray(technicalPlan.bidAnalysis?.evidences) ? technicalPlan.bidAnalysis.evidences : [];
  const evidence = evidences.find((item) => section.title.includes(item.title) || item.title.includes(section.title));

  return {
    id: `chapter-${index + 1}`,
    title: section.title,
    content: [
      `${section.title}部分基于当前招标分析、已编辑目录和知识库引用自动生成。`,
      `本章节重点围绕“${section.title}”展开响应，突出项目理解、实施路径和交付保障。`,
      evidence ? `招标证据摘录：${evidence.evidence}` : '当前未提取到直接证据摘录，建议人工补充招标原文要点。',
      section.children?.length
        ? `建议在本章节内覆盖以下子主题：${section.children.map((child) => child.title).join('、')}。`
        : '当前章节还没有子主题拆分，可在目录编辑阶段继续补充。',
      knowledgeTitles.length > 0
        ? `当前可参考的知识库条目包括：${knowledgeTitles.join('、')}。`
        : '当前还没有选中的知识库条目，正文内容主要基于目录和招标分析生成。',
      `后续可在正文编辑阶段继续补充参数指标、时间计划和人员安排等细节。`,
    ].join('\n\n'),
    summary: `本章围绕“${section.title}”组织技术响应，覆盖实施路径、交付保障与重点子主题。`,
    references: knowledgeReferences,
    generatedAt,
    updatedAt: generatedAt,
  };
}

function rewriteChapterDraft(chapter, instruction) {
  const prompt = String(instruction || '').trim() || '请优化当前章节表达';
  const updatedAt = new Date().toISOString();
  return {
    ...chapter,
    content: [
      chapter.content || '',
      '',
      `【改写说明】已根据以下要求重写本章：${prompt}`,
      `【改写结果】建议围绕现有章节结构强化表达完整性、交付承诺和实施细节，并保留原有章节主题。`,
    ].join('\n'),
    summary: `本章已根据“${prompt}”完成改写，可继续人工润色。`,
    updatedAt,
  };
}

function buildExportedDocument(technicalPlan) {
  return exportTechnicalPlanToDocx({
    ...technicalPlan,
    knowledgeReferences: buildKnowledgeReferenceMap(technicalPlan),
  });
}

function buildTaskSummary(technicalPlan, taskType) {
  if (taskType === 'parse-document') {
    return technicalPlan.parsedDocument
      ? `解析完成，已生成 ${technicalPlan.parsedDocument.outline?.length || 0} 个目录项。`
      : '解析完成。';
  }

  if (taskType === 'bid-analysis') {
    return technicalPlan.bidAnalysis?.summary || '招标分析已完成。';
  }

  if (taskType === 'outline-generation') {
    return technicalPlan.generatedOutline?.summary || '目录生成已完成。';
  }

  if (taskType === 'content-generation') {
    return technicalPlan.generatedContent?.summary || '正文生成已完成。';
  }

  if (taskType === 'export-document') {
    return technicalPlan.exportedDocument?.summary || '导出已完成。';
  }

  return '任务已完成。';
}

function recordRecentTaskSummary(technicalPlan, taskType) {
  const nextItem = {
    id: `task-summary-${Date.now()}`,
    taskType,
    summary: buildTaskSummary(technicalPlan, taskType),
    createdAt: new Date().toISOString(),
  };

  technicalPlan.recentTaskSummaries = [
    nextItem,
    ...(Array.isArray(technicalPlan.recentTaskSummaries) ? technicalPlan.recentTaskSummaries : []),
  ].slice(0, 8);
}

async function handleTechnicalPlans(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/technical-plans') {
    sendJson(response, 200, { success: true, data: technicalPlans });
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/technical-plans') {
    const body = await readBody(request).catch(() => null);
    if (!body) {
      sendJson(response, 400, { success: false, message: '请求体不是合法 JSON' });
      return true;
    }

    const now = new Date().toISOString();
      const technicalPlan = {
        id: `tp-${Date.now()}`,
        title: String(body.title || '未命名技术方案'),
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
        updatedAt: now,
      };
    technicalPlans.unshift(technicalPlan);
    persistTechnicalPlans();
    sendJson(response, 201, { success: true, data: technicalPlan });
    return true;
  }

  const detailMatch = url.pathname.match(/^\/technical-plans\/([^/]+)$/);
  if (request.method === 'GET' && detailMatch) {
    const technicalPlan = technicalPlans.find((item) => item.id === detailMatch[1]);
    if (!technicalPlan) {
      sendJson(response, 404, { success: false, message: '技术方案不存在' });
      return true;
    }
    sendJson(response, 200, { success: true, data: technicalPlan });
    return true;
  }

  const tenderFileMatch = url.pathname.match(/^\/technical-plans\/([^/]+)\/tender-file$/);
  if (request.method === 'POST' && tenderFileMatch) {
    const technicalPlan = technicalPlans.find((item) => item.id === tenderFileMatch[1]);
    if (!technicalPlan) {
      sendJson(response, 404, { success: false, message: '技术方案不存在' });
      return true;
    }

    const body = await readBody(request).catch(() => null);
    if (!body) {
      sendJson(response, 400, { success: false, message: '请求体不是合法 JSON' });
      return true;
    }

    let uploadedFile = null;
    if (body.contentBase64) {
      uploadedFile = storeTechnicalPlanFile(technicalPlan.id, {
        fileName: body.name,
        contentBase64: body.contentBase64,
        mimeType: body.mimeType,
      });
    }

    technicalPlan.tenderFile = {
      name: String(body.name || 'tender.md'),
      extension: String(body.extension || '.md'),
      content: String(body.content || ''),
      mimeType: String(body.mimeType || uploadedFile?.mimeType || 'text/plain'),
      size: Number(body.size || uploadedFile?.size || 0),
      storage: uploadedFile,
      uploadedAt: new Date().toISOString(),
    };
    technicalPlan.updatedAt = new Date().toISOString();
    persistTechnicalPlans();

    sendJson(response, 200, { success: true, data: technicalPlan });
    return true;
  }

  const generatedContentMatch = url.pathname.match(/^\/technical-plans\/([^/]+)\/generated-content$/);
  if (request.method === 'POST' && generatedContentMatch) {
    const technicalPlan = technicalPlans.find((item) => item.id === generatedContentMatch[1]);
    if (!technicalPlan) {
      sendJson(response, 404, { success: false, message: '技术方案不存在' });
      return true;
    }

    const body = await readBody(request).catch(() => null);
    if (!body || !Array.isArray(body.chapters)) {
      sendJson(response, 400, { success: false, message: '正文内容格式不正确' });
      return true;
    }

    technicalPlan.generatedContent = {
      summary: String(body.summary || technicalPlan.generatedContent?.summary || '正文草稿已更新。'),
      chapters: body.chapters.map((chapter, index) => ({
        id: String(chapter.id || `chapter-${index + 1}`),
        title: String(chapter.title || `章节 ${index + 1}`),
        content: String(chapter.content || ''),
        summary: String(chapter.summary || `本章围绕“${String(chapter.title || `章节 ${index + 1}`)}”整理正文草稿，可继续补充实施细节。`),
        references: Array.isArray(chapter.references) ? chapter.references : [],
        generatedAt: String(chapter.generatedAt || technicalPlan.generatedContent?.chapters?.[index]?.generatedAt || new Date().toISOString()),
        updatedAt: new Date().toISOString(),
      })),
      createdAt: technicalPlan.generatedContent?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    technicalPlan.currentStep = 'editing';
    technicalPlan.updatedAt = new Date().toISOString();
    persistTechnicalPlans();

    sendJson(response, 200, { success: true, data: technicalPlan });
    return true;
  }

  const regenerateChapterMatch = url.pathname.match(/^\/technical-plans\/([^/]+)\/generated-content\/([^/]+)\/regenerate$/);
  if (request.method === 'POST' && regenerateChapterMatch) {
    const technicalPlan = technicalPlans.find((item) => item.id === regenerateChapterMatch[1]);
    if (!technicalPlan) {
      sendJson(response, 404, { success: false, message: '技术方案不存在' });
      return true;
    }

    const chapterId = regenerateChapterMatch[2];
    const chapterIndex = technicalPlan.generatedContent?.chapters?.findIndex((chapter) => chapter.id === chapterId) ?? -1;
    if (chapterIndex < 0) {
      sendJson(response, 404, { success: false, message: '章节不存在' });
      return true;
    }

    const currentChapter = technicalPlan.generatedContent.chapters[chapterIndex];
    const section = technicalPlan.generatedOutline?.sections?.find((item) => item.title === currentChapter.title)
      || {
        id: currentChapter.id,
        title: currentChapter.title,
        level: 1,
        children: [],
      };

    const regeneratedChapter = buildChapterDraft(technicalPlan, section, chapterIndex);
    try {
      const modelChapter = await regenerateChapterWithModel(technicalPlan, section, currentChapter.id, chapterIndex);
      technicalPlan.generatedContent.chapters[chapterIndex] = modelChapter;
      technicalPlan.generatedContent.updatedAt = new Date().toISOString();
      technicalPlan.updatedAt = new Date().toISOString();
      persistTechnicalPlans();

      sendJson(response, 200, { success: true, data: modelChapter });
      return true;
    } catch {
      regeneratedChapter.id = currentChapter.id;
    }

    technicalPlan.generatedContent.chapters[chapterIndex] = regeneratedChapter;
    technicalPlan.generatedContent.updatedAt = new Date().toISOString();
    technicalPlan.updatedAt = new Date().toISOString();
    persistTechnicalPlans();

    sendJson(response, 200, { success: true, data: regeneratedChapter });
    return true;
  }

  const rewriteChapterMatch = url.pathname.match(/^\/technical-plans\/([^/]+)\/generated-content\/([^/]+)\/rewrite$/);
  if (request.method === 'POST' && rewriteChapterMatch) {
    const technicalPlan = technicalPlans.find((item) => item.id === rewriteChapterMatch[1]);
    if (!technicalPlan) {
      sendJson(response, 404, { success: false, message: '技术方案不存在' });
      return true;
    }

    const chapterId = rewriteChapterMatch[2];
    const chapterIndex = technicalPlan.generatedContent?.chapters?.findIndex((chapter) => chapter.id === chapterId) ?? -1;
    if (chapterIndex < 0) {
      sendJson(response, 404, { success: false, message: '章节不存在' });
      return true;
    }

    const body = await readBody(request).catch(() => null);
    const instruction = String(body?.instruction || '').trim();
    if (!instruction) {
      sendJson(response, 400, { success: false, message: '改写指令不能为空' });
      return true;
    }

    let rewrittenChapter;
    try {
      rewrittenChapter = await rewriteChapterWithModel(technicalPlan.generatedContent.chapters[chapterIndex], instruction);
    } catch {
      rewrittenChapter = rewriteChapterDraft(technicalPlan.generatedContent.chapters[chapterIndex], instruction);
    }
    technicalPlan.generatedContent.chapters[chapterIndex] = rewrittenChapter;
    technicalPlan.generatedContent.updatedAt = new Date().toISOString();
    technicalPlan.updatedAt = new Date().toISOString();
    persistTechnicalPlans();

    sendJson(response, 200, { success: true, data: rewrittenChapter });
    return true;
  }

  const generatedOutlineMatch = url.pathname.match(/^\/technical-plans\/([^/]+)\/generated-outline$/);
  if (request.method === 'POST' && generatedOutlineMatch) {
    const technicalPlan = technicalPlans.find((item) => item.id === generatedOutlineMatch[1]);
    if (!technicalPlan) {
      sendJson(response, 404, { success: false, message: '技术方案不存在' });
      return true;
    }

    const body = await readBody(request).catch(() => null);
    if (!body || !Array.isArray(body.sections)) {
      sendJson(response, 400, { success: false, message: '目录结构格式不正确' });
      return true;
    }

    technicalPlan.generatedOutline = {
      summary: String(body.summary || technicalPlan.generatedOutline?.summary || '目录草稿已更新。'),
      sections: normalizeOutlineSections(body.sections),
      createdAt: technicalPlan.generatedOutline?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    technicalPlan.updatedAt = new Date().toISOString();
    persistTechnicalPlans();

    sendJson(response, 200, { success: true, data: technicalPlan });
    return true;
  }

  const knowledgeReferenceMatch = url.pathname.match(/^\/technical-plans\/([^/]+)\/knowledge-references$/);
  if (request.method === 'POST' && knowledgeReferenceMatch) {
    const technicalPlan = technicalPlans.find((item) => item.id === knowledgeReferenceMatch[1]);
    if (!technicalPlan) {
      sendJson(response, 404, { success: false, message: '技术方案不存在' });
      return true;
    }

    const body = await readBody(request).catch(() => null);
    if (!body || !Array.isArray(body.references)) {
      sendJson(response, 400, { success: false, message: '知识库引用格式不正确' });
      return true;
    }

    technicalPlan.knowledgeReferences = body.references.map((reference, index) => ({
      id: String(reference.id || `kb-ref-${index + 1}`),
      documentId: String(reference.documentId || ''),
      itemId: String(reference.itemId || ''),
      title: String(reference.title || '未命名引用'),
    })).filter((reference) => reference.documentId && reference.itemId);
    technicalPlan.updatedAt = new Date().toISOString();
    persistTechnicalPlans();

    sendJson(response, 200, { success: true, data: technicalPlan });
    return true;
  }

  const exportMetadataMatch = url.pathname.match(/^\/technical-plans\/([^/]+)\/export-metadata$/);
  if (request.method === 'POST' && exportMetadataMatch) {
    const technicalPlan = technicalPlans.find((item) => item.id === exportMetadataMatch[1]);
    if (!technicalPlan) {
      sendJson(response, 404, { success: false, message: '技术方案不存在' });
      return true;
    }

    const body = await readBody(request).catch(() => null);
    if (!body) {
      sendJson(response, 400, { success: false, message: '导出信息格式不正确' });
      return true;
    }

    technicalPlan.exportMetadata = {
      projectName: String(body.projectName || ''),
      bidReferenceNo: String(body.bidReferenceNo || ''),
      bidderName: String(body.bidderName || ''),
    };
    technicalPlan.updatedAt = new Date().toISOString();
    persistTechnicalPlans();

    sendJson(response, 200, { success: true, data: technicalPlan });
    return true;
  }

  const exportedDocumentMatch = url.pathname.match(/^\/technical-plans\/([^/]+)\/exported-document$/);
  if (request.method === 'GET' && exportedDocumentMatch) {
    const technicalPlan = technicalPlans.find((item) => item.id === exportedDocumentMatch[1]);
    if (!technicalPlan) {
      sendJson(response, 404, { success: false, message: '技术方案不存在' });
      return true;
    }

    if (!technicalPlan.exportedDocument) {
      sendJson(response, 404, { success: false, message: '还没有可下载的导出文件' });
      return true;
    }

    const downloadPath = technicalPlan.exportedDocument.download?.filePath;
    if (downloadPath && fs.existsSync(downloadPath)) {
      response.writeHead(200, {
        'Content-Type': technicalPlan.exportedDocument.download?.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(technicalPlan.exportedDocument.fileName)}"`,
      });
      response.end(fs.readFileSync(downloadPath));
      return true;
    }

    response.writeHead(200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(technicalPlan.exportedDocument.markdown?.fileName || technicalPlan.exportedDocument.fileName)}"`,
    });
    response.end(technicalPlan.exportedDocument.content);
    return true;
  }

  const taskMatch = url.pathname.match(/^\/technical-plans\/([^/]+)\/tasks\/(parse-document|bid-analysis|outline-generation|content-generation|export-document)$/);
  if (request.method === 'POST' && taskMatch) {
    const technicalPlan = technicalPlans.find((item) => item.id === taskMatch[1]);
    if (!technicalPlan) {
      sendJson(response, 404, { success: false, message: '技术方案不存在' });
      return true;
    }
    const task = createTask({
      type: taskMatch[2],
      resourceType: 'technical-plan',
      resourceId: technicalPlan.id,
      message: `技术方案任务已入队：${taskMatch[2]}`,
    });

    setTimeout(() => {
      updateTask(task.id, {
        status: 'running',
        progress: 35,
        message: `技术方案任务执行中：${task.type}`,
      });
    }, 200);

    setTimeout(() => {
      const finishTask = async () => {
      if (task.type === 'parse-document') {
        const tenderFile = technicalPlan.tenderFile || {
          name: 'demo.md',
          extension: '.md',
          content: '# 招标文件解析占位\n\n当前还没有真实上传文件，返回默认解析结果。',
        };

        let parsedDocument;
        if (tenderFile.storage?.filePath) {
          const parser = isTextExtension(tenderFile.extension) ? 'text' : 'docling';
          const parsedResult = parseDocumentFromFile(tenderFile.storage.filePath, parser);
          parsedDocument = createParsedDocument({
            fileName: tenderFile.name,
            extension: tenderFile.extension,
            parser,
            markdown: parsedResult.markdown || '# 空文档',
            plainText: parsedResult.plainText || '',
            outline: parsedResult.outline,
            tables: parsedResult.tables,
            assets: parsedResult.assets,
            metadata: parsedResult.metadata,
            warnings: parsedResult.warnings,
          });
        } else {
          parsedDocument = createParsedDocument({
            fileName: tenderFile.name,
            extension: tenderFile.extension,
            parser: isTextExtension(tenderFile.extension) ? 'text' : 'docling',
            markdown: tenderFile.content || '# 空文档',
            plainText: tenderFile.content || '空文档',
            warnings: isTextExtension(tenderFile.extension)
              ? []
              : ['当前返回的是 Docling 占位解析结果，真实集成待接入。'],
          });
        }

        technicalPlan.parsedDocument = parsedDocument;
        technicalPlan.currentStep = 'bid-analysis';
        technicalPlan.updatedAt = new Date().toISOString();
        persistTechnicalPlans();
      }

      if (task.type === 'bid-analysis') {
        try {
          technicalPlan.bidAnalysis = await generateBidAnalysisWithModel(technicalPlan);
        } catch {
          technicalPlan.bidAnalysis = buildBidAnalysis(technicalPlan);
        }
        technicalPlan.currentStep = 'outline-generation';
        technicalPlan.updatedAt = new Date().toISOString();
        persistTechnicalPlans();
      }

      if (task.type === 'outline-generation') {
        try {
          technicalPlan.generatedOutline = await generateOutlineWithModel(technicalPlan);
        } catch {
          technicalPlan.generatedOutline = buildGeneratedOutline(technicalPlan);
        }
        technicalPlan.currentStep = 'content-generation';
        technicalPlan.updatedAt = new Date().toISOString();
        persistTechnicalPlans();
      }

      if (task.type === 'content-generation') {
        const sections = technicalPlan.generatedOutline?.sections?.length
          ? technicalPlan.generatedOutline.sections
          : buildGeneratedOutline(technicalPlan).sections;

        try {
          technicalPlan.generatedContent = await generateContentWithModel(technicalPlan, sections);
        } catch {
          technicalPlan.generatedContent = buildGeneratedContent(technicalPlan);
        }
        technicalPlan.currentStep = 'editing';
        technicalPlan.updatedAt = new Date().toISOString();
        persistTechnicalPlans();
      }

      if (task.type === 'export-document') {
        technicalPlan.exportedDocument = buildExportedDocument(technicalPlan);
        technicalPlan.currentStep = 'export';
        technicalPlan.updatedAt = new Date().toISOString();
        persistTechnicalPlans();
      }

      recordRecentTaskSummary(technicalPlan, task.type);
      technicalPlan.updatedAt = new Date().toISOString();
      persistTechnicalPlans();

      updateTask(task.id, {
        status: 'success',
        progress: 100,
        message: `技术方案任务已完成：${task.type}`,
      });
      };

      finishTask().catch((error) => {
        updateTask(task.id, {
          status: 'error',
          progress: 100,
          message: error instanceof Error ? error.message : `技术方案任务执行失败：${task.type}`,
        });
      });
    }, 800);

    sendJson(response, 202, {
      success: true,
      data: {
        taskId: task.id,
        status: task.status,
        taskType: task.type,
        resourceType: task.resourceType,
        resourceId: task.resourceId,
      },
    });
    return true;
  }

  return false;
}

module.exports = {
  handleTechnicalPlans,
};
