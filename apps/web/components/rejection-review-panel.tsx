'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { saveRejectionReview } from '../lib/api';

type FindingType = 'rejection' | 'typo' | 'logic';

interface ReviewState {
  status: 'pending' | 'resolved';
  note: string;
}

interface RejectionReviewPanelProps {
  type: FindingType;
  items: Array<{
    id: string;
    title: string;
    summary?: string;
    detailLines: string[];
    severity?: string;
    review?: ReviewState;
  }>;
}

export function RejectionReviewPanel({ type, items }: RejectionReviewPanelProps) {
  const router = useRouter();
  const [savingId, setSavingId] = useState('');
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState<Record<string, ReviewState>>(() => Object.fromEntries(items.map((item) => [item.id, item.review || { status: 'pending', note: '' }])));

  async function handleSave(id: string) {
    const draft = drafts[id] || { status: 'pending', note: '' };
    setSavingId(id);
    setMessage('');

    try {
      await saveRejectionReview({ type, id, status: draft.status, note: draft.note });
      setMessage('处理状态已保存');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSavingId('');
    }
  }

  return (
    <div className="risk-card-list">
      {items.length > 0 ? items.map((item) => {
        const draft = drafts[item.id] || { status: 'pending', note: '' };
        return (
          <article key={item.id} className="risk-card">
            <div className="risk-card-head">
              <strong>{item.title}</strong>
              <span className="status-pill">{item.severity || draft.status}</span>
            </div>
            {item.summary ? <p>{item.summary}</p> : null}
            {item.detailLines.map((line) => <p key={`${item.id}-${line}`}>{line}</p>)}
            <div className="field-group">
              <label>处理状态</label>
              <select className="text-input" value={draft.status} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, status: event.target.value === 'resolved' ? 'resolved' : 'pending' } }))}>
                <option value="pending">待处理</option>
                <option value="resolved">已处理</option>
              </select>
            </div>
            <div className="field-group">
              <label>备注</label>
              <textarea className="textarea-input" value={draft.note} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, note: event.target.value } }))} placeholder="记录人工复核结论或后续动作" />
            </div>
            <div className="action-row">
              <button className="ghost-button" type="button" onClick={() => void handleSave(item.id)} disabled={savingId === item.id}>{savingId === item.id ? '保存中...' : '保存处理结果'}</button>
            </div>
          </article>
        );
      }) : <div className="placeholder-box">当前没有检查结果。</div>}
      {message ? <p className="muted-text">{message}</p> : null}
    </div>
  );
}
