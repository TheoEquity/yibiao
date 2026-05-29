import { AppNav } from '../../components/app-nav';
import { SettingsForm } from '../../components/settings-form';
import { fetchSettings } from '../../lib/api';

export default async function SettingsPage() {
  const result = await fetchSettings();
  const settings = result.data as {
    textModel: { provider: string; base_url: string; model_name: string; api_key?: string };
    imageModel: { provider: string; base_url: string; model_name: string; api_key?: string; status: string };
    fileParser: { provider: string; keepImages: boolean; fallbackProvider: string };
    general: { developer_mode: boolean; real_time_render: boolean };
  };

  return (
    <main className="workspace-shell">
      <AppNav />
      <header className="workspace-header page-section-gap">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>设置</h1>
          <p>当前 Web 版已提供文本模型、生图模型、文件解析和通用配置的展示底座。</p>
        </div>
      </header>

      <SettingsForm initialSettings={settings} />

      <section className="panel-grid panel-grid-wide">
        <article className="stage-card">
          <h2>文本模型</h2>
          <p>Provider：{settings.textModel.provider}</p>
          <p>Base URL：{settings.textModel.base_url}</p>
          <p>Model：{settings.textModel.model_name}</p>
        </article>
        <article className="stage-card">
          <h2>生图模型</h2>
          <p>Provider：{settings.imageModel.provider}</p>
          <p>Base URL：{settings.imageModel.base_url}</p>
          <p>Model：{settings.imageModel.model_name}</p>
          <p>状态：{settings.imageModel.status}</p>
        </article>
        <article className="stage-card">
          <h2>文件解析</h2>
          <p>Provider：{settings.fileParser.provider}</p>
          <p>保留图片：{settings.fileParser.keepImages ? '开启' : '关闭'}</p>
          <p>回退解析器：{settings.fileParser.fallbackProvider}</p>
        </article>
        <article className="stage-card">
          <h2>通用配置</h2>
          <p>开发者模式：{settings.general.developer_mode ? '开启' : '关闭'}</p>
          <p>实时渲染：{settings.general.real_time_render ? '开启' : '关闭'}</p>
        </article>
      </section>
    </main>
  );
}
