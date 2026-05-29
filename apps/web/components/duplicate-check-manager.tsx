'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { addDuplicateBidFile, runDuplicateCheck, saveDuplicateTenderFile } from '../lib/api';

function isTextFile(file: File) {
  const fileName = file.name.toLowerCase();
  return ['.md', '.markdown', '.txt', '.json', '.csv'].some((extension) => fileName.endsWith(extension));
}

async function readFileAsBase64(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export function DuplicateCheckManager() {
  const router = useRouter();
  const [tenderFileName, setTenderFileName] = useState('tender.md');
  const [tenderContent, setTenderContent] = useState('');
  const [bidFileName, setBidFileName] = useState('bid-a.md');
  const [bidContent, setBidContent] = useState('');
  const [tenderUploadPayload, setTenderUploadPayload] = useState<null | { extension: string; contentBase64?: string; mimeType?: string; size?: number }>(null);
  const [bidUploadPayload, setBidUploadPayload] = useState<null | { extension: string; contentBase64?: string; mimeType?: string; size?: number }>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSaveTender(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await saveDuplicateTenderFile({
        fileName: tenderFileName,
        content: tenderContent,
        extension: tenderUploadPayload?.extension,
        contentBase64: tenderUploadPayload?.contentBase64,
        mimeType: tenderUploadPayload?.mimeType,
        size: tenderUploadPayload?.size,
      });
      setMessage('招标文件已保存');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddBidFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await addDuplicateBidFile({
        fileName: bidFileName,
        content: bidContent,
        extension: bidUploadPayload?.extension,
        contentBase64: bidUploadPayload?.contentBase64,
        mimeType: bidUploadPayload?.mimeType,
        size: bidUploadPayload?.size,
      });
      setBidFileName(`bid-${Date.now()}.md`);
      setBidContent('');
      setBidUploadPayload(null);
      setMessage('投标文件已添加');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '添加失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleRunAnalysis() {
    setSaving(true);
    setMessage('');

    try {
      await runDuplicateCheck();
      setMessage('查重分析已完成');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '执行失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleTenderFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setTenderFileName(file.name);
      if (isTextFile(file)) {
        const nextContent = await file.text();
        setTenderContent(nextContent);
        setTenderUploadPayload({
          extension: `.${file.name.split('.').pop() || 'txt'}`.toLowerCase(),
          contentBase64: await readFileAsBase64(file),
          mimeType: file.type || 'text/plain',
          size: file.size,
        });
      } else {
        setTenderContent('');
        setTenderUploadPayload({
          extension: `.${file.name.split('.').pop() || 'bin'}`.toLowerCase(),
          contentBase64: await readFileAsBase64(file),
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
        });
      }
      setMessage(`已读取文件：${file.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '读取文件失败');
    }
  }

  async function handleBidFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setBidFileName(file.name);
      if (isTextFile(file)) {
        const nextContent = await file.text();
        setBidContent(nextContent);
        setBidUploadPayload({
          extension: `.${file.name.split('.').pop() || 'txt'}`.toLowerCase(),
          contentBase64: await readFileAsBase64(file),
          mimeType: file.type || 'text/plain',
          size: file.size,
        });
      } else {
        setBidContent('');
        setBidUploadPayload({
          extension: `.${file.name.split('.').pop() || 'bin'}`.toLowerCase(),
          contentBase64: await readFileAsBase64(file),
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
        });
      }
      setMessage(`已读取文件：${file.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '读取文件失败');
    }
  }

  return (
    <div className="manager-stack">
      <form className="stage-card embedded-card" onSubmit={handleSaveTender}>
        <h2>录入招标文件</h2>
        <div className="field-group">
          <label htmlFor="duplicate-tender-file-upload">选择文件</label>
          <input
            id="duplicate-tender-file-upload"
            className="text-input"
            type="file"
            accept=".md,.markdown,.txt,.json,.csv,.doc,.docx,.pdf"
            onChange={handleTenderFileChange}
          />
        </div>
        <div className="field-group">
          <label htmlFor="duplicate-tender-file-name">文件名</label>
          <input id="duplicate-tender-file-name" className="text-input" value={tenderFileName} onChange={(event) => setTenderFileName(event.target.value)} />
        </div>
        <div className="field-group">
          <label htmlFor="duplicate-tender-content">招标文件内容</label>
          <textarea id="duplicate-tender-content" className="textarea-input" value={tenderContent} onChange={(event) => setTenderContent(event.target.value)} />
        </div>
        <button className="primary-button" type="submit" disabled={saving || (!tenderContent.trim() && !tenderUploadPayload?.contentBase64)}>
          {saving ? '保存中...' : '保存招标文件'}
        </button>
      </form>

      <form className="stage-card embedded-card" onSubmit={handleAddBidFile}>
        <h2>添加投标文件</h2>
        <div className="field-group">
          <label htmlFor="duplicate-bid-file-upload">选择文件</label>
          <input
            id="duplicate-bid-file-upload"
            className="text-input"
            type="file"
            accept=".md,.markdown,.txt,.json,.csv,.doc,.docx,.pdf"
            onChange={handleBidFileChange}
          />
        </div>
        <div className="field-group">
          <label htmlFor="duplicate-bid-file-name">文件名</label>
          <input id="duplicate-bid-file-name" className="text-input" value={bidFileName} onChange={(event) => setBidFileName(event.target.value)} />
        </div>
        <div className="field-group">
          <label htmlFor="duplicate-bid-content">投标文件内容</label>
          <textarea id="duplicate-bid-content" className="textarea-input" value={bidContent} onChange={(event) => setBidContent(event.target.value)} />
        </div>
        <div className="action-row">
          <button className="primary-button" type="submit" disabled={saving || (!bidContent.trim() && !bidUploadPayload?.contentBase64)}>
            {saving ? '提交中...' : '添加投标文件'}
          </button>
          <button className="ghost-button" type="button" onClick={handleRunAnalysis} disabled={saving}>
            执行查重
          </button>
        </div>
        {message ? <p className="muted-text">{message}</p> : null}
      </form>
    </div>
  );
}
