'use client';

import { useState } from 'react';

interface SimpleTextDocumentFormProps {
  title: string;
  fileNameLabel: string;
  contentLabel: string;
  initialFileName?: string;
  initialContent?: string;
  submitLabel: string;
  onSubmit: (payload: { fileName: string; content: string }) => Promise<void>;
}

export function SimpleTextDocumentForm({
  title,
  fileNameLabel,
  contentLabel,
  initialFileName = '',
  initialContent = '',
  submitLabel,
  onSubmit,
}: SimpleTextDocumentFormProps) {
  const [fileName, setFileName] = useState(initialFileName);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await onSubmit({ fileName, content });
      setMessage(`${title}已保存`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="tender-form" onSubmit={handleSubmit}>
      <div className="field-group">
        <label>{fileNameLabel}</label>
        <input className="text-input" value={fileName} onChange={(event) => setFileName(event.target.value)} />
      </div>
      <div className="field-group">
        <label>{contentLabel}</label>
        <textarea className="textarea-input" value={content} onChange={(event) => setContent(event.target.value)} />
      </div>
      <div className="action-row">
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? '保存中...' : submitLabel}
        </button>
      </div>
      {message ? <p className="muted-text">{message}</p> : null}
    </form>
  );
}
