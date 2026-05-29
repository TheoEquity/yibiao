'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { extractRejectionItems, runRejectionCheck, saveRejectionDocument } from '../lib/api';

export function RejectionCheckManager() {
  const router = useRouter();
  const [tenderFileName, setTenderFileName] = useState('tender.md');
  const [tenderContent, setTenderContent] = useState('');
  const [bidFileName, setBidFileName] = useState('bid.md');
  const [bidContent, setBidContent] = useState('');
  const [selectedTenderFile, setSelectedTenderFile] = useState<File | null>(null);
  const [selectedBidFile, setSelectedBidFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function saveDocument(type: 'tender' | 'bid', payload: { fileName: string; content: string }) {
    setSaving(true);
    setMessage('');

    try {
      const selectedFile = type === 'tender' ? selectedTenderFile : selectedBidFile;
      const extensionIndex = payload.fileName.lastIndexOf('.');
      const extension = extensionIndex >= 0 ? payload.fileName.slice(extensionIndex).toLowerCase() : '.md';
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

      await saveRejectionDocument(type, { ...payload, extension, contentBase64, mimeType, size });
      setMessage(type === 'tender' ? '招标文件已保存' : '投标文件已保存');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleExtract() {
    setSaving(true);
    setMessage('');
    try {
      await extractRejectionItems();
      setMessage('废标项已提取');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '提取失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleRun() {
    setSaving(true);
    setMessage('');
    try {
      await runRejectionCheck();
      setMessage('废标项检查已完成');
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

    setSelectedTenderFile(file);

    try {
      setTenderFileName(file.name);

      const isTextFile = file.type.startsWith('text/') || ['.md', '.markdown', '.txt', '.json', '.csv'].some((item) => file.name.toLowerCase().endsWith(item));
      if (isTextFile) {
        const nextContent = await file.text();
        setTenderContent(nextContent);
      } else {
        setTenderContent('');
      }

      setMessage(`已选择文件：${file.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '读取文件失败');
    }
  }

  async function handleBidFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSelectedBidFile(file);

    try {
      setBidFileName(file.name);

      const isTextFile = file.type.startsWith('text/') || ['.md', '.markdown', '.txt', '.json', '.csv'].some((item) => file.name.toLowerCase().endsWith(item));
      if (isTextFile) {
        const nextContent = await file.text();
        setBidContent(nextContent);
      } else {
        setBidContent('');
      }

      setMessage(`已选择文件：${file.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '读取文件失败');
    }
  }

  return (
    <div className="manager-stack">
      <form className="stage-card embedded-card" onSubmit={(event) => { event.preventDefault(); void saveDocument('tender', { fileName: tenderFileName, content: tenderContent }); }}>
        <h2>录入招标文件</h2>
        <div className="field-group">
          <label htmlFor="rejection-tender-file-upload">选择文件</label>
          <input
            id="rejection-tender-file-upload"
            className="text-input"
            type="file"
            accept=".md,.markdown,.txt,.json,.csv,.pdf,.doc,.docx"
            onChange={handleTenderFileChange}
          />
        </div>
        <div className="field-group">
          <label htmlFor="rejection-tender-file-name">文件名</label>
          <input id="rejection-tender-file-name" className="text-input" value={tenderFileName} onChange={(event) => setTenderFileName(event.target.value)} />
        </div>
        <div className="field-group">
          <label htmlFor="rejection-tender-content">内容</label>
          <textarea id="rejection-tender-content" className="textarea-input" value={tenderContent} onChange={(event) => setTenderContent(event.target.value)} placeholder="可直接粘贴内容，也可选择本地文件。非文本文件将交给服务端 Docling 解析。" />
        </div>
        <button className="primary-button" type="submit" disabled={saving || (!tenderContent.trim() && !selectedTenderFile)}>保存招标文件</button>
      </form>

      <form className="stage-card embedded-card" onSubmit={(event) => { event.preventDefault(); void saveDocument('bid', { fileName: bidFileName, content: bidContent }); }}>
        <h2>录入投标文件</h2>
        <div className="field-group">
          <label htmlFor="rejection-bid-file-upload">选择文件</label>
          <input
            id="rejection-bid-file-upload"
            className="text-input"
            type="file"
            accept=".md,.markdown,.txt,.json,.csv,.pdf,.doc,.docx"
            onChange={handleBidFileChange}
          />
        </div>
        <div className="field-group">
          <label htmlFor="rejection-bid-file-name">文件名</label>
          <input id="rejection-bid-file-name" className="text-input" value={bidFileName} onChange={(event) => setBidFileName(event.target.value)} />
        </div>
        <div className="field-group">
          <label htmlFor="rejection-bid-content">内容</label>
          <textarea id="rejection-bid-content" className="textarea-input" value={bidContent} onChange={(event) => setBidContent(event.target.value)} placeholder="可直接粘贴内容，也可选择本地文件。非文本文件将交给服务端 Docling 解析。" />
        </div>
        <div className="action-row">
          <button className="primary-button" type="submit" disabled={saving || (!bidContent.trim() && !selectedBidFile)}>保存投标文件</button>
          <button className="ghost-button" type="button" onClick={handleExtract} disabled={saving}>提取废标项</button>
          <button className="ghost-button" type="button" onClick={handleRun} disabled={saving}>执行检查</button>
        </div>
        {message ? <p className="muted-text">{message}</p> : null}
      </form>
    </div>
  );
}
