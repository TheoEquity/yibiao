'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createKnowledgeDocument, createKnowledgeFolder } from '../lib/api';

interface KnowledgeBaseManagerProps {
  folders: Array<{ id: string; name: string }>;
}

export function KnowledgeBaseManager({ folders }: KnowledgeBaseManagerProps) {
  const router = useRouter();
  const [folderName, setFolderName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState(folders[0]?.id || '');
  const [fileName, setFileName] = useState('knowledge.md');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreateFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await createKnowledgeFolder(folderName);
      setFolderName('');
      setMessage('知识库文件夹已创建');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '创建失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      let contentBase64: string | undefined;
      let mimeType: string | undefined;
      let size: number | undefined;
      const extensionIndex = fileName.lastIndexOf('.');
      const extension = extensionIndex >= 0 ? fileName.slice(extensionIndex).toLowerCase() : '.md';

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

      await createKnowledgeDocument({ folderId: selectedFolderId, fileName, content, extension, contentBase64, mimeType, size });
      setContent('');
      setSelectedFile(null);
      setMessage('知识库文档已保存');
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
      setFileName(file.name);

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
    <div className="manager-stack">
      <form className="stage-card embedded-card" onSubmit={handleCreateFolder}>
        <h2>新建知识库文件夹</h2>
        <div className="field-group">
          <label htmlFor="knowledge-folder-name">文件夹名称</label>
          <input id="knowledge-folder-name" className="text-input" value={folderName} onChange={(event) => setFolderName(event.target.value)} />
        </div>
        <div className="action-row">
          <button className="primary-button" type="submit" disabled={saving || !folderName.trim()}>
            {saving ? '提交中...' : '创建文件夹'}
          </button>
        </div>
      </form>

      <form className="stage-card embedded-card" onSubmit={handleCreateDocument}>
        <h2>录入知识库文档</h2>
        <div className="field-group">
          <label htmlFor="knowledge-file-upload">选择文件</label>
          <input
            id="knowledge-file-upload"
            className="text-input"
            type="file"
            accept=".md,.markdown,.txt,.json,.csv,.pdf,.doc,.docx"
            onChange={handleFileChange}
          />
        </div>
        <div className="field-group">
          <label htmlFor="knowledge-folder-select">所属文件夹</label>
          <select id="knowledge-folder-select" className="text-input" value={selectedFolderId} onChange={(event) => setSelectedFolderId(event.target.value)}>
            {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="knowledge-file-name">文件名</label>
          <input id="knowledge-file-name" className="text-input" value={fileName} onChange={(event) => setFileName(event.target.value)} />
        </div>
        <div className="field-group">
          <label htmlFor="knowledge-file-content">文档内容</label>
          <textarea id="knowledge-file-content" className="textarea-input" value={content} onChange={(event) => setContent(event.target.value)} placeholder="可直接粘贴内容，也可选择本地文件。非文本文件将交给服务端 Docling 解析。" />
        </div>
        <div className="action-row">
          <button className="primary-button" type="submit" disabled={saving || !selectedFolderId || (!content.trim() && !selectedFile)}>
            {saving ? '提交中...' : '保存文档'}
          </button>
        </div>
        {message ? <p className="muted-text">{message}</p> : null}
      </form>
    </div>
  );
}
