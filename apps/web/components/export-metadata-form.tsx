'use client';

import { useState } from 'react';
import { saveTechnicalPlanExportMetadata } from '../lib/api';

interface ExportMetadataFormProps {
  technicalPlanId: string;
  initialValue?: {
    projectName?: string;
    bidReferenceNo?: string;
    bidderName?: string;
  } | null;
}

export function ExportMetadataForm({ technicalPlanId, initialValue }: ExportMetadataFormProps) {
  const [projectName, setProjectName] = useState(initialValue?.projectName || '');
  const [bidReferenceNo, setBidReferenceNo] = useState(initialValue?.bidReferenceNo || '');
  const [bidderName, setBidderName] = useState(initialValue?.bidderName || '');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await saveTechnicalPlanExportMetadata(technicalPlanId, {
        projectName,
        bidReferenceNo,
        bidderName,
      });
      setMessage('导出信息已保存');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <label className="stack-field">
        <span>项目名称</span>
        <input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="填写招标项目名称" />
      </label>
      <label className="stack-field">
        <span>招标编号</span>
        <input value={bidReferenceNo} onChange={(event) => setBidReferenceNo(event.target.value)} placeholder="填写招标编号" />
      </label>
      <label className="stack-field">
        <span>投标单位</span>
        <input value={bidderName} onChange={(event) => setBidderName(event.target.value)} placeholder="填写投标单位名称" />
      </label>
      <div className="action-row">
        <button className="primary-button" type="submit" disabled={saving}>{saving ? '保存中...' : '保存导出信息'}</button>
        {message ? <span className="muted-text">{message}</span> : null}
      </div>
    </form>
  );
}
