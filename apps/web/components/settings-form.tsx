'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { saveSettings } from '../lib/api';

interface SettingsFormProps {
  initialSettings: {
    textModel: { provider: string; base_url: string; model_name: string; api_key?: string };
    imageModel: { provider: string; base_url: string; model_name: string; status: string; api_key?: string };
    fileParser: { provider: string; keepImages: boolean; fallbackProvider: string };
    general: { developer_mode: boolean; real_time_render: boolean };
  };
}

function normalizeSettings(initial: SettingsFormProps['initialSettings']): SettingsFormProps['initialSettings'] {
  return {
    textModel: {
      provider: initial.textModel?.provider || '',
      base_url: initial.textModel?.base_url || '',
      model_name: initial.textModel?.model_name || '',
      api_key: initial.textModel?.api_key || '',
    },
    imageModel: {
      provider: initial.imageModel?.provider || '',
      base_url: initial.imageModel?.base_url || '',
      model_name: initial.imageModel?.model_name || '',
      status: initial.imageModel?.status || 'untested',
      api_key: initial.imageModel?.api_key || '',
    },
    fileParser: {
      provider: initial.fileParser?.provider || 'docling',
      keepImages: initial.fileParser?.keepImages ?? false,
      fallbackProvider: initial.fileParser?.fallbackProvider || 'local-text',
    },
    general: {
      developer_mode: initial.general?.developer_mode ?? false,
      real_time_render: initial.general?.real_time_render ?? false,
    },
  };
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const router = useRouter();
  const [settings, setSettings] = useState(() => normalizeSettings(initialSettings));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await saveSettings(settings);
      setMessage('设置已保存');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="manager-stack" onSubmit={handleSubmit}>
      <article className="stage-card embedded-card">
        <h2>文本模型</h2>
        <div className="field-group">
          <label>Provider</label>
          <input className="text-input" value={settings.textModel.provider} onChange={(event) => setSettings((current) => ({ ...current, textModel: { ...current.textModel, provider: event.target.value } }))} />
        </div>
        <div className="field-group">
          <label>Base URL</label>
          <input className="text-input" value={settings.textModel.base_url} onChange={(event) => setSettings((current) => ({ ...current, textModel: { ...current.textModel, base_url: event.target.value } }))} />
        </div>
        <div className="field-group">
          <label>API Key</label>
          <input className="text-input" type="password" value={settings.textModel.api_key} onChange={(event) => setSettings((current) => ({ ...current, textModel: { ...current.textModel, api_key: event.target.value } }))} />
        </div>
        <div className="field-group">
          <label>Model</label>
          <input className="text-input" value={settings.textModel.model_name} onChange={(event) => setSettings((current) => ({ ...current, textModel: { ...current.textModel, model_name: event.target.value } }))} />
        </div>
      </article>

      <article className="stage-card embedded-card">
        <h2>生图模型</h2>
        <div className="field-group">
          <label>Provider</label>
          <input className="text-input" value={settings.imageModel.provider} onChange={(event) => setSettings((current) => ({ ...current, imageModel: { ...current.imageModel, provider: event.target.value } }))} />
        </div>
        <div className="field-group">
          <label>Base URL</label>
          <input className="text-input" value={settings.imageModel.base_url} onChange={(event) => setSettings((current) => ({ ...current, imageModel: { ...current.imageModel, base_url: event.target.value } }))} />
        </div>
        <div className="field-group">
          <label>API Key</label>
          <input className="text-input" type="password" value={settings.imageModel.api_key} onChange={(event) => setSettings((current) => ({ ...current, imageModel: { ...current.imageModel, api_key: event.target.value } }))} />
        </div>
        <div className="field-group">
          <label>Model</label>
          <input className="text-input" value={settings.imageModel.model_name} onChange={(event) => setSettings((current) => ({ ...current, imageModel: { ...current.imageModel, model_name: event.target.value } }))} />
        </div>
      </article>

      <article className="stage-card embedded-card">
        <h2>文件解析与通用配置</h2>
        <div className="field-group">
          <label>文件解析 Provider</label>
          <input className="text-input" value={settings.fileParser.provider} onChange={(event) => setSettings((current) => ({ ...current, fileParser: { ...current.fileParser, provider: event.target.value } }))} />
        </div>
        <div className="field-group checkbox-row">
          <label htmlFor="keep-images-checkbox">保留图片</label>
          <input id="keep-images-checkbox" type="checkbox" checked={settings.fileParser.keepImages} onChange={(event) => setSettings((current) => ({ ...current, fileParser: { ...current.fileParser, keepImages: event.target.checked } }))} />
        </div>
        <div className="field-group checkbox-row">
          <label htmlFor="developer-mode-checkbox">开发者模式</label>
          <input id="developer-mode-checkbox" type="checkbox" checked={settings.general.developer_mode} onChange={(event) => setSettings((current) => ({ ...current, general: { ...current.general, developer_mode: event.target.checked } }))} />
        </div>
        <div className="field-group checkbox-row">
          <label htmlFor="real-time-render-checkbox">实时渲染</label>
          <input id="real-time-render-checkbox" type="checkbox" checked={settings.general.real_time_render} onChange={(event) => setSettings((current) => ({ ...current, general: { ...current.general, real_time_render: event.target.checked } }))} />
        </div>
      </article>

      <div className="action-row">
        <button className="primary-button" type="submit" disabled={saving}>{saving ? '保存中...' : '保存设置'}</button>
      </div>
      {message ? <p className="muted-text">{message}</p> : null}
    </form>
  );
}
