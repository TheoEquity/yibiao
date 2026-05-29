import { AppNav } from '../../components/app-nav';
import { DocumentIngestSummary } from '../../components/document-ingest-summary';
import { DuplicateCheckManager } from '../../components/duplicate-check-manager';
import { ReportExportPanel } from '../../components/report-export-panel';
import { fetchDuplicateCheck, getDuplicateCheckReportUrl } from '../../lib/api';

export default async function DuplicateCheckPage() {
  const result = await fetchDuplicateCheck();
  const data = result.data as {
    tenderFile?: { fileName: string; extension?: string; mimeType?: string; size?: number; warnings?: string[] } | null;
    bidFiles?: Array<{ id: string; fileName: string; extension?: string; mimeType?: string; size?: number; warnings?: string[] }>;
    analysis?: {
      summary: string;
      risks: Array<{ id: string; title: string; severity: string; detail: string; paragraph?: string; files?: string[]; evidence?: Array<{ fileName: string; excerpt: string }> }>;
      metadata: { totalFiles: number; sameOutline: boolean; tenderReferenced: boolean; highRiskPairs?: number };
      outlinePairs: Array<{ fileName: string; headings: string[] }>;
      pairComparisons: Array<{ id: string; files: string[]; repeatedCount: number; severity: string; examples: string[]; similarityScore?: number; outlineScore?: number; matches: Array<{ id: string; leftFileName: string; rightFileName: string; leftExcerpt: string; rightExcerpt: string; similarity?: number }> }>;
    } | null;
    reportDocument?: { fileName: string; summary?: string; format?: string } | null;
  };

  const bidFiles = data.bidFiles || [];
  const risks = data.analysis?.risks || [];
  const outlinePairs = data.analysis?.outlinePairs || [];
  const pairComparisons = data.analysis?.pairComparisons || [];

  return (
    <main className="workspace-shell">
      <AppNav />
      <header className="workspace-header page-section-gap">
        <div>
          <p className="eyebrow">Duplicate Check</p>
          <h1>标书查重</h1>
          <p>当前 Web 版支持招标文件引用、多份投标文件输入和规则化重复风险分析。</p>
        </div>
      </header>

      <DuplicateCheckManager />

      <section className="page-section-gap">
        <ReportExportPanel
          label="查重报告"
          triggerUrl="/api/duplicate-check/export-report"
          downloadUrl={getDuplicateCheckReportUrl()}
          reportDocument={data.reportDocument}
        />
      </section>

      <section className="panel-grid panel-grid-wide">
        <article className="stage-card">
          <h2>文件概况</h2>
          <DocumentIngestSummary title="招标文件" file={data.tenderFile} />
          <p>投标文件数：{bidFiles.length}</p>
          <div className="document-summary-stack">
            {bidFiles.map((file) => <DocumentIngestSummary key={file.id} title="投标文件" file={file} />)}
          </div>
        </article>
        <article className="stage-card">
          <h2>查重结果</h2>
          {data.analysis ? (
            <div className="analysis-block no-top-gap">
              <p className="analysis-summary">{data.analysis.summary}</p>
              <div className="analysis-grid duplicate-analysis-grid">
                <section>
                  <h3>分析统计</h3>
                  <div className="document-summary-block no-top-gap">
                    <div className="document-summary-grid">
                      <span>投标文件总数：{data.analysis.metadata.totalFiles}</span>
                      <span>目录一致：{data.analysis.metadata.sameOutline ? '是' : '否'}</span>
                      <span>已引用招标文件：{data.analysis.metadata.tenderReferenced ? '是' : '否'}</span>
                      <span>高风险文件对：{data.analysis.metadata.highRiskPairs || 0}</span>
                    </div>
                  </div>
                </section>
                <section>
                  <h3>目录对比</h3>
                  <div className="knowledge-item-list compact-card-stack">
                    {outlinePairs.length > 0 ? outlinePairs.map((item) => (
                      <article key={item.fileName} className="knowledge-item-card compact-card">
                        <strong>{item.fileName}</strong>
                        <ul className="analysis-list compact-list">
                          {item.headings.length > 0 ? item.headings.map((heading) => <li key={heading}>{heading}</li>) : <li>未提取到目录</li>}
                        </ul>
                      </article>
                    )) : <div className="placeholder-box">当前还没有目录对比数据。</div>}
                  </div>
                </section>
                <section>
                  <h3>风险项</h3>
                  <div className="risk-card-list">
                    {risks.length > 0 ? risks.map((risk) => (
                      <article key={risk.id} className="risk-card">
                        <div className="risk-card-head">
                          <strong>{risk.title}</strong>
                          <span className="status-pill">{risk.severity}</span>
                        </div>
                        <p>{risk.detail}</p>
                        {risk.evidence?.length ? (
                          <div className="duplicate-evidence-grid">
                            {risk.evidence.map((item) => (
                              <article key={`${risk.id}-${item.fileName}`} className="duplicate-evidence-card">
                                <strong>{item.fileName}</strong>
                                <pre className="content-preview">{item.excerpt}</pre>
                              </article>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    )) : <div className="placeholder-box">暂无显著重复风险。</div>}
                  </div>
                </section>
                <section>
                  <h3>文件对照强度</h3>
                  <div className="pair-comparison-list">
                    {pairComparisons.length > 0 ? pairComparisons.map((pair) => (
                      <article key={pair.id} className="pair-comparison-card">
                        <div className="risk-card-head">
                          <strong>{pair.files.join(' vs ')}</strong>
                          <span className="status-pill">{pair.severity}</span>
                        </div>
                        <p>重复段落数：{pair.repeatedCount}</p>
                        <p>段落相似度：{pair.similarityScore || 0}</p>
                        <p>目录重合度：{pair.outlineScore || 0}</p>
                        <ul className="analysis-list compact-list">
                          {pair.examples.map((example) => <li key={`${pair.id}-${example}`}>{example}</li>)}
                        </ul>
                        {pair.matches.length > 0 ? (
                          <div className="pair-match-list">
                            {pair.matches.map((match) => (
                              <article key={match.id} className="pair-match-card">
                                <div className="pair-match-header">
                                  <strong>{match.leftFileName}</strong>
                                  <strong>{match.rightFileName}</strong>
                                </div>
                                <div className="pair-match-grid">
                                  <pre className="content-preview">{match.leftExcerpt}</pre>
                                  <pre className="content-preview">{match.rightExcerpt}</pre>
                                </div>
                                {typeof match.similarity === 'number' ? <span className="muted-text">相似度：{match.similarity}</span> : null}
                              </article>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    )) : <div className="placeholder-box">当前还没有形成可对照的文件组合。</div>}
                  </div>
                </section>
              </div>
            </div>
          ) : <div className="placeholder-box">当前还没有执行查重分析。</div>}
        </article>
      </section>
    </main>
  );
}
