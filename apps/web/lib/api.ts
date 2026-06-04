const SERVER_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://127.0.0.1:3001';
const BROWSER_API_BASE_URL = '/api';

type RequestOptions = {
  body?: unknown;
  method?: 'GET' | 'POST';
  next?: RequestInit['next'];
};

type ApiResult<T = unknown> = {
  success: boolean;
  data: T;
  message?: string;
};

type TechnicalPlanSummary = {
  id: string;
  title: string;
  status: string;
  currentStep: string;
  updatedAt?: string;
};

type TaskTriggerResult = {
  taskId: string;
  status: string;
  taskType: string;
  resourceType: string;
  resourceId: string;
};

type ChapterDraft = {
  id: string;
  title: string;
  content: string;
  summary?: string;
  references?: Array<{ id: string; documentId: string; itemId: string; title: string }>;
  generatedAt?: string;
  updatedAt?: string;
};

function buildUrl(path: string) {
  if (typeof window !== 'undefined') {
    return `${BROWSER_API_BASE_URL}${path}`;
  }

  return new URL(path, SERVER_API_BASE_URL).toString();
}

async function request<T = unknown>(path: string, options: RequestOptions = {}) {
  const response = await fetch(buildUrl(path), {
    method: options.method || (options.body ? 'POST' : 'GET'),
    headers: options.body ? { 'Content-Type': 'application/json; charset=utf-8' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
    next: options.next,
  });

  const payload = await response.json().catch(() => null) as ApiResult<T> | null;
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || `请求失败：${response.status}`);
  }

  return payload;
}

export function getTaskStreamUrl() {
  return buildUrl('/tasks/stream');
}

export function getExportedDocumentUrl(technicalPlanId: string) {
  return buildUrl(`/technical-plans/${technicalPlanId}/exported-document`);
}

export function getDuplicateCheckReportUrl() {
  return buildUrl('/duplicate-check/report-document');
}

export function getRejectionCheckReportUrl() {
  return buildUrl('/rejection-check/report-document');
}

export function fetchTechnicalPlans() {
  return request<TechnicalPlanSummary[]>('/technical-plans');
}

export function fetchTechnicalPlan(id: string) {
  return request(`/technical-plans/${id}`);
}

export function createTechnicalPlan(title: string) {
  return request<TechnicalPlanSummary>('/technical-plans', {
    body: { title },
  });
}

export function saveTenderFile(
  technicalPlanId: string,
  payload: {
    name: string;
    extension?: string;
    content?: string;
    contentBase64?: string;
    mimeType?: string;
    size?: number;
  },
) {
  return request(`/technical-plans/${technicalPlanId}/tender-file`, {
    body: payload,
  });
}

export function triggerTechnicalPlanTask(
  technicalPlanId: string,
  taskType: 'parse-document' | 'bid-analysis' | 'outline-generation' | 'content-generation' | 'export-document',
) {
  return request<TaskTriggerResult>(`/technical-plans/${technicalPlanId}/tasks/${taskType}`, {
    body: {},
  });
}

export function saveGeneratedOutline(
  technicalPlanId: string,
  payload: {
    summary: string;
    sections: Array<{ id?: string; title?: string; level?: number; children?: Array<{ id?: string; title?: string; level?: number }> }>;
  },
) {
  return request(`/technical-plans/${technicalPlanId}/generated-outline`, {
    body: payload,
  });
}

export function saveGeneratedContent(
  technicalPlanId: string,
  payload: {
    summary: string;
    chapters: Array<{
      id?: string;
      title?: string;
      content?: string;
      summary?: string;
      references?: Array<{ id: string; documentId: string; itemId: string; title: string }>;
      generatedAt?: string;
      updatedAt?: string;
    }>;
  },
) {
  return request(`/technical-plans/${technicalPlanId}/generated-content`, {
    body: payload,
  });
}

export function regenerateGeneratedChapter(technicalPlanId: string, chapterId: string) {
  return request<ChapterDraft>(`/technical-plans/${technicalPlanId}/generated-content/${chapterId}/regenerate`, {
    body: {},
  });
}

export function rewriteGeneratedChapter(technicalPlanId: string, chapterId: string, instruction: string) {
  return request<ChapterDraft>(`/technical-plans/${technicalPlanId}/generated-content/${chapterId}/rewrite`, {
    body: { instruction },
  });
}

export function saveTechnicalPlanKnowledgeReferences(
  technicalPlanId: string,
  payload: {
    references: Array<{ id?: string; documentId: string; itemId: string; title: string }>;
  },
) {
  return request(`/technical-plans/${technicalPlanId}/knowledge-references`, {
    body: payload,
  });
}

export function saveTechnicalPlanExportMetadata(
  technicalPlanId: string,
  payload: { projectName?: string; bidReferenceNo?: string; bidderName?: string },
) {
  return request(`/technical-plans/${technicalPlanId}/export-metadata`, {
    body: payload,
  });
}

export function fetchSettings() {
  return request('/settings');
}

export function saveSettings(payload: unknown) {
  return request('/settings', {
    body: payload,
  });
}

export function fetchKnowledgeBase() {
  return request('/knowledge-base');
}

export function createKnowledgeFolder(name: string) {
  return request('/knowledge-base/folders', {
    body: { name },
  });
}

export function createKnowledgeDocument(payload: {
  folderId: string;
  fileName: string;
  content?: string;
  extension?: string;
  contentBase64?: string;
  mimeType?: string;
  size?: number;
}) {
  return request('/knowledge-base/documents', {
    body: payload,
  });
}

export function fetchKnowledgeDocument(id: string) {
  return request(`/knowledge-base/documents/${id}`);
}

export function fetchDuplicateCheck() {
  return request('/duplicate-check');
}

export function saveDuplicateTenderFile(payload: {
  fileName: string;
  content?: string;
  extension?: string;
  contentBase64?: string;
  mimeType?: string;
  size?: number;
}) {
  return request('/duplicate-check/tender-file', {
    body: payload,
  });
}

export function addDuplicateBidFile(payload: {
  fileName: string;
  content?: string;
  extension?: string;
  contentBase64?: string;
  mimeType?: string;
  size?: number;
}) {
  return request('/duplicate-check/bid-files', {
    body: payload,
  });
}

export function runDuplicateCheck() {
  return request('/duplicate-check/run', {
    body: {},
  });
}

export function fetchRejectionCheck() {
  return request('/rejection-check');
}

export function saveRejectionDocument(
  type: 'tender' | 'bid',
  payload: {
    fileName: string;
    content?: string;
    extension?: string;
    contentBase64?: string;
    mimeType?: string;
    size?: number;
  },
) {
  const segment = type === 'tender' ? 'tender-document' : 'bid-document';
  return request(`/rejection-check/${segment}`, {
    body: payload,
  });
}

export function extractRejectionItems() {
  return request('/rejection-check/extract-items', {
    body: {},
  });
}

export function runRejectionCheck() {
  return request('/rejection-check/run', {
    body: {},
  });
}

export function saveRejectionReview(payload: {
  type: 'rejection' | 'typo' | 'logic';
  id: string;
  status: 'pending' | 'resolved';
  note: string;
}) {
  return request('/rejection-check/review', {
    body: payload,
  });
}
