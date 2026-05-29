'use client';

import { useState } from 'react';

interface ReportExportPanelProps {
  label: string;
  triggerUrl: string;
  downloadUrl: string;
  reportDocument?: {
    fileName: string;
    summary?: string;
    format?: string;
  } | null;
}

export function ReportExportPanel({ label, triggerUrl, downloadUrl, reportDocument }: ReportExportPanelProps) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');

  async function handleExport() {
    setRunning(true);
    setMessage('');
    try {
      const response = await fetch(triggerUrl, { method: 'POST' });
      if (!response.ok) {
        throw new Error('触发失败');
      }
      setMessage(`${label}已生成`);
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
          {running ? '生成中...' : `导出${label}`}
        </button>
        {reportDocument ? <a className="ghost-button export-link" href={downloadUrl} target="_blank" rel="noreferrer">下载报告</a> : null}
      </div>
      {message ? <p className="muted-text">{message}</p> : null}
      {reportDocument ? (
        <div className="export-result-card">
          <strong>{reportDocument.fileName}</strong>
          {reportDocument.summary ? <span>{reportDocument.summary}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
