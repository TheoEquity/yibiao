import Link from 'next/link';
import { AppNav } from '../../components/app-nav';
import { DocumentIngestSummary } from '../../components/document-ingest-summary';
import { KnowledgeBaseManager } from '../../components/knowledge-base-manager';
import { fetchKnowledgeBase } from '../../lib/api';

export default async function KnowledgeBasePage() {
  const result = await fetchKnowledgeBase();
  const data = result.data as {
    folders: Array<{ id: string; name: string }>;
    documents: Array<{ id: string; folder_id: string; file_name: string; status: string; item_count: number; extension?: string; mime_type?: string; size?: number; warnings?: string[] }>;
    items: Record<string, Array<{ id: string; title: string; resume: string }>>;
  };

  return (
    <main className="workspace-shell">
      <AppNav />
      <header className="workspace-header page-section-gap">
        <div>
          <p className="eyebrow">Knowledge Base</p>
          <h1>知识库</h1>
          <p>当前 Web 版已具备知识库文件夹、文档和条目抽取结果展示。</p>
        </div>
      </header>

      <KnowledgeBaseManager folders={data.folders} />

      <section className="panel-grid">
        {data.folders.map((folder) => {
          const documents = data.documents.filter((document) => document.folder_id === folder.id);
          return (
            <article key={folder.id} className="stage-card">
              <h2>{folder.name}</h2>
              <p className="muted-text">文档数：{documents.length}</p>
              <div className="knowledge-document-list">
                {documents.length > 0 ? documents.map((document) => (
                  <div key={document.id} className="knowledge-document-card">
                    <strong>{document.file_name}</strong>
                    <span>状态：{document.status}</span>
                    <span>条目数：{document.item_count}</span>
                    <Link className="inline-link" href={`/knowledge-base/${document.id}`}>查看文档详情</Link>
                    <DocumentIngestSummary
                      title="文档解析信息"
                      file={{
                        fileName: document.file_name,
                        extension: document.extension,
                        mime_type: document.mime_type,
                        size: document.size,
                        warnings: document.warnings,
                      }}
                    />
                    <ul className="analysis-list compact-list">
                      {(data.items[document.id] || []).slice(0, 4).map((item) => (
                        <li key={item.id}>{item.title}</li>
                      ))}
                    </ul>
                  </div>
                )) : <div className="placeholder-box">当前文件夹还没有知识库文档。</div>}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
