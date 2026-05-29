export type TaskStatus = 'pending' | 'queued' | 'running' | 'success' | 'error' | 'canceled';

export type TaskType =
  | 'document-parse'
  | 'bid-analysis'
  | 'outline-generation'
  | 'content-generation'
  | 'knowledge-item-extraction'
  | 'knowledge-match'
  | 'duplicate-check-run'
  | 'rejection-item-extraction'
  | 'rejection-check-run'
  | 'word-export';

export interface ParsedDocumentAsset {
  assetId: string;
  type: 'image';
  storageKey: string;
  url: string;
  mimeType: string;
}

export interface ParsedDocumentOutlineItem {
  level: number;
  title: string;
}

export interface ParsedDocumentTable {
  id: string;
  html?: string;
  markdown?: string;
  page?: number;
}

export interface ParsedDocumentResult {
  markdown: string;
  plainText: string;
  outline: ParsedDocumentOutlineItem[];
  tables: ParsedDocumentTable[];
  assets: ParsedDocumentAsset[];
  metadata: {
    fileName: string;
    extension: string;
    parser: 'docling' | 'text';
    pageCount?: number;
    hasOcr?: boolean;
  };
  warnings: string[];
}

export interface TechnicalPlanSummary {
  id: string;
  title: string;
  status: string;
  currentStep: string;
  updatedAt: string;
}

export interface TechnicalPlanDetail extends TechnicalPlanSummary {
  tenderFileId?: string;
  parsedDocumentId?: string;
  projectOverview?: string;
  techRequirements?: string;
  outlineMode?: string;
}

export interface TaskRecord {
  id: string;
  type: TaskType;
  status: TaskStatus;
  progress: number;
  resourceType: string;
  resourceId: string;
  message?: string;
  createdAt: string;
  updatedAt: string;
}
