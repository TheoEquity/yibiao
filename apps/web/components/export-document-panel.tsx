'use client';

import { useState } from 'react';
import { getExportedDocumentUrl, triggerTechnicalPlanTask } from '../lib/api';

interface ExportDocumentPanelProps {
  technicalPlanId: string;
  exportedDocument?: {
    format: string;
    fileName: string;
    summary: string;
    generatedAt: string;
  } | null;
}

export function ExportDocumentPanel({ technicalPlanId, exportedDocument }: ExportDocumentPanelProps) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');

  async function handleExport() {
    setRunning(true);
    setMessage('');

    try {
      const result = await triggerTechnicalPlanTask(technicalPlanId, 'export-document');
      setMessage(`导出任务已创建：${result.data.taskId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导出失败');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="export-panel">
      <div className="action-row">
        <button className="primary-button" type="button" onClick={handleExport} disabled={running}>
          {running ? '提交中...' : '导出 DOCX'}
        </button>
        {exportedDocument ? (
          <a className="ghost-button export-link" href={getExportedDocumentUrl(technicalPlanId)} target="_blank" rel="noreferrer">
            下载文件
          </a>
        ) : null}
      </div>
      {message ? <p className="muted-text">{message}</p> : null}
      {exportedDocument ? (
        <div className="export-result-card">
          <strong>{exportedDocument.fileName}</strong>
          <span>{exportedDocument.summary}</span>
          <span>格式：{exportedDocument.format}</span>
        </div>
      ) : (
        <div className="placeholder-box">完成正文编辑后，触发导出任务生成可下载的 DOCX 文件。</div>
      )}
    </div>
  );
}
