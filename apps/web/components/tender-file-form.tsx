'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { saveTenderFile } from '../lib/api';

interface TenderFileFormProps {
  technicalPlanId: string;
  initialName?: string;
  initialContent?: string;
}

function guessExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');
  return index >= 0 ? fileName.slice(index).toLowerCase() : '.md';
}

export function TenderFileForm({ technicalPlanId, initialName = '', initialContent = '' }: TenderFileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName || 'tender.md');
  const [content, setContent] = useState(initialContent);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const extension = useMemo(() => guessExtension(name), [name]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      let contentBase64: string | undefined;
      let mimeType: string | undefined;
      let size: number | undefined;

      if (selectedFile) {
        const fileBuffer = await selectedFile.arrayBuffer();
        const uint8Array = new Uint8Array(fileBuffer);
        let binary = '';
        for (const value of uint8Array) {
          binary += String.fromCharCode(value);
        }
        contentBase64 = btoa(binary);
        mimeType = selectedFile.type || 'application/octet-stream';
        size = selectedFile.size;
      }

      await saveTenderFile(technicalPlanId, {
        name,
        extension,
        content,
        contentBase64,
        mimeType,
        size,
      });
      setMessage('招标文件已保存');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSelectedFile(file);

    try {
      setName(file.name);

      const isTextFile = file.type.startsWith('text/') || ['.md', '.markdown', '.txt', '.json', '.csv'].some((item) => file.name.toLowerCase().endsWith(item));
      if (isTextFile) {
        const nextContent = await file.text();
        setContent(nextContent);
      } else {
        setContent('');
      }

      setMessage(`已选择文件：${file.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '读取文件失败');
    }
  }

  return (
    <form className="tender-form" onSubmit={handleSubmit}>
      <div className="field-group">
        <label htmlFor="tender-file-upload">选择文件</label>
        <input
          id="tender-file-upload"
          className="text-input"
          type="file"
          accept=".md,.markdown,.txt,.json,.csv,.pdf,.doc,.docx"
          onChange={handleFileChange}
        />
      </div>
      <div className="field-group">
        <label htmlFor="tender-file-name">文件名</label>
        <input
          id="tender-file-name"
          className="text-input"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="例如：招标文件.md"
        />
      </div>
      <div className="field-group">
        <label htmlFor="tender-file-content">文件内容</label>
        <textarea
          id="tender-file-content"
          className="textarea-input"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="可直接粘贴内容，也可先选择本地文本文件。"
        />
      </div>
      <div className="action-row">
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? '保存中...' : '保存招标文件'}
        </button>
        <span className="muted-text">当前扩展名：{extension}</span>
      </div>
      {message ? <p className="muted-text">{message}</p> : null}
    </form>
  );
}
