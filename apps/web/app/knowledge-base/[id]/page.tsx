import Link from 'next/link';
import { AppNav } from '../../../components/app-nav';
import { DocumentIngestSummary } from '../../../components/document-ingest-summary';
import { fetchKnowledgeDocument } from '../../../lib/api';

export default async function KnowledgeDocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await fetchKnowledgeDocument(id);
  const data = result.data as {
    document: {
      id: string;
      file_name: string;
      folder_id: string;
      markdown: string;
      extension?: string;
      mime_type?: string;
      size?: number;
      warnings?: string[];
      item_count: number;
      status: string;
      message?: string;
      created_at: string;
      updated_at: string;
    };
    items: Array<{
      id: string;
      title: string;
      resume: string;
      content: string;
      source_file: string;
    }>;
  };

  return (
    <main className="workspace-shell">
      <AppNav />
      <header className="workspace-header page-section-gap">
        <div>
          <p className="eyebrow">Knowledge Document</p>
          <h1>{data.document.file_name}</h1>
          <p>这里展示知识库文档的完整解析结果、条目摘要和原始 Markdown 内容。</p>
        </div>
        <div className="topbar-actions">
          <Link className="ghost-button" href="/knowledge-base">返回知识库</Link>
        </div>
      </header>

      <section className="panel-grid panel-grid-wide">
        <article className="stage-card">
          <h2>文档信息</h2>
          <p className="muted-text">状态：{data.document.status}</p>
          <p className="muted-text">条目数：{data.document.item_count}</p>
          <p className="muted-text">更新时间：{new Date(data.document.updated_at).toLocaleString('zh-CN', { hour12: false })}</p>
          <DocumentIngestSummary
            title="解析摘要"
            file={{
              fileName: data.document.file_name,
              extension: data.document.extension,
              mime_type: data.document.mime_type,
              size: data.document.size,
              warnings: data.document.warnings,
            }}
          />
        </article>

        <article className="stage-card">
          <h2>知识条目</h2>
          <div className="knowledge-item-list">
            {data.items.length > 0 ? data.items.map((item) => (
              <article key={item.id} className="knowledge-item-card">
                <h3>{item.title}</h3>
                <p className="muted-text">{item.resume}</p>
                <pre className="content-preview">{item.content}</pre>
              </article>
            )) : <div className="placeholder-box">当前文档还没有提取知识条目。</div>}
          </div>
        </article>

        <article className="stage-card knowledge-markdown-card">
          <h2>Markdown 全文</h2>
          <pre className="markdown-preview">{data.document.markdown}</pre>
        </article>
      </section>
    </main>
  );
}
