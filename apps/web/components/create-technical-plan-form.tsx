'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createTechnicalPlan, saveTenderFile } from '../lib/api';

function guessExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');
  return index >= 0 ? fileName.slice(index).toLowerCase() : '.md';
}

export function CreateTechnicalPlanForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      setFile(null);
      setFileContent('');
      return;
    }

    setFile(selectedFile);

    try {
      const isTextFile = selectedFile.type.startsWith('text/') || ['.md', '.markdown', '.txt', '.json', '.csv'].some((item) => selectedFile.name.toLowerCase().endsWith(item));
      if (isTextFile) {
        const content = await selectedFile.text();
        setFileContent(content);
      } else {
        setFileContent('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取文件失败');
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const result = await createTechnicalPlan(title.trim() || '未命名技术方案');
      const plan = result.data;

      if (file) {
        let contentBase64: string | undefined;
        let mimeType: string | undefined;
        let size: number | undefined;

        if (fileContent) {
          const uint8Array = new TextEncoder().encode(fileContent);
          let binary = '';
          for (const value of uint8Array) {
            binary += String.fromCharCode(value);
          }
          contentBase64 = btoa(binary);
        } else {
          const fileBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(fileBuffer);
          let binary = '';
          for (const value of uint8Array) {
            binary += String.fromCharCode(value);
          }
          contentBase64 = btoa(binary);
          mimeType = file.type || 'application/octet-stream';
          size = file.size;
        }

        await saveTenderFile(plan.id, {
          name: file.name,
          extension: guessExtension(file.name),
          content: fileContent,
          contentBase64,
          mimeType,
          size,
        });
      }

      router.push(`/technical-plans/${plan.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <input
        className="text-input"
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="输入技术方案标题"
        required
      />
      <input
        id="tender-upload"
        type="file"
        accept=".md,.markdown,.txt,.json,.csv,.pdf,.doc,.docx"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <label htmlFor="tender-upload" className="ghost-button" style={{ cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap' }}>
        {file ? file.name : '+ 选择招标文件'}
      </label>
      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting ? '创建中...' : '新建技术方案'}
      </button>
      {error ? <p className="error-text">{error}</p> : null}
    </form>
  );
}
