'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { saveTechnicalPlanKnowledgeReferences } from '../lib/api';

interface KnowledgeReferencePanelProps {
  technicalPlanId: string;
  documents: Array<{
    id: string;
    file_name: string;
    items: Array<{ id: string; title: string }>;
  }>;
  initialReferences: Array<{ id: string; documentId: string; itemId: string; title: string }>;
}

export function KnowledgeReferencePanel({ technicalPlanId, documents, initialReferences }: KnowledgeReferencePanelProps) {
  const router = useRouter();
  const [selectedKeys, setSelectedKeys] = useState<string[]>(initialReferences.map((item) => `${item.documentId}:${item.itemId}`));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function toggleKey(key: string) {
    setSelectedKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');

    try {
      const references = selectedKeys.map((key, index) => {
        const [documentId, itemId] = key.split(':');
        const document = documents.find((item) => item.id === documentId);
        const knowledgeItem = document?.items.find((item) => item.id === itemId);
        return {
          id: `kb-ref-${index + 1}`,
          documentId,
          itemId,
          title: knowledgeItem?.title || '未命名引用',
        };
      });

      await saveTechnicalPlanKnowledgeReferences(technicalPlanId, { references });
      setMessage('知识库引用已保存');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="side-card">
      <div className="card-head">
        <h2>知识库引用</h2>
        <span className="muted-text">已选 {selectedKeys.length} 项</span>
      </div>
      <div className="knowledge-reference-list">
        {documents.length > 0 ? documents.map((document) => (
          <section key={document.id} className="knowledge-reference-group">
            <strong>{document.file_name}</strong>
            <div className="knowledge-reference-items">
              {document.items.map((item) => {
                const key = `${document.id}:${item.id}`;
                return (
                  <label key={key} className="knowledge-reference-item">
                    <input type="checkbox" checked={selectedKeys.includes(key)} onChange={() => toggleKey(key)} />
                    <span>{item.title}</span>
                  </label>
                );
              })}
            </div>
          </section>
        )) : <p>当前知识库还没有可引用条目。</p>}
      </div>
      <div className="action-row">
        <button className="primary-button" type="button" onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存引用'}</button>
      </div>
      {message ? <p className="muted-text">{message}</p> : null}
    </article>
  );
}
