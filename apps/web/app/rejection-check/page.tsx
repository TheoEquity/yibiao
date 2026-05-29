import { AppNav } from '../../components/app-nav';
import { DocumentIngestSummary } from '../../components/document-ingest-summary';
import { RejectionCheckManager } from '../../components/rejection-check-manager';
import { ReportExportPanel } from '../../components/report-export-panel';
import { RejectionReviewPanel } from '../../components/rejection-review-panel';
import { fetchRejectionCheck, getRejectionCheckReportUrl } from '../../lib/api';

export default async function RejectionCheckPage() {
  const result = await fetchRejectionCheck();
  const data = result.data as {
    tenderDocument?: { fileName: string; extension?: string; mimeType?: string; size?: number; warnings?: string[] } | null;
    bidDocument?: { fileName: string; extension?: string; mimeType?: string; size?: number; warnings?: string[] } | null;
    extractedItems?: Array<{ id: string; title: string; source: string; severity: string }> | null;
    checkResult?: {
      rejection: { findings: Array<{ id: string; title: string; summary: string; requirement?: string; bidEvidence?: string; riskReason?: string; suggestion?: string; severity?: string; review?: { status: 'pending' | 'resolved'; note: string } }> };
      typo: { findings: Array<{ id: string; wrongText: string; reason: string; correctText?: string; originalExcerpt?: string; locationHint?: string; review?: { status: 'pending' | 'resolved'; note: string } }> };
      logic: { findings: Array<{ id: string; title: string; suggestion: string; originalText?: string; locationHint?: string; fallacyReason?: string; review?: { status: 'pending' | 'resolved'; note: string } }> };
    } | null;
    reportDocument?: { fileName: string; summary?: string; format?: string } | null;
  };

  return (
    <main className="workspace-shell">
      <AppNav />
      <header className="workspace-header page-section-gap">
        <div>
          <p className="eyebrow">Rejection Check</p>
          <h1>废标项检查</h1>
          <p>当前 Web 版支持招标文件、投标文件、废标项提取与检查结果展示。</p>
        </div>
      </header>

      <RejectionCheckManager />

      <section className="page-section-gap">
        <ReportExportPanel
          label="检查报告"
          triggerUrl="/api/rejection-check/export-report"
          downloadUrl={getRejectionCheckReportUrl()}
          reportDocument={data.reportDocument}
        />
      </section>

      <section className="manager-stack">
        <article className="stage-card embedded-card">
          <h2>文档输入</h2>
          <DocumentIngestSummary title="招标文件" file={data.tenderDocument} />
          <DocumentIngestSummary title="投标文件" file={data.bidDocument} />
        </article>
        <article className="stage-card embedded-card">
          <h2>废标项提取</h2>
          {data.extractedItems?.length ? (
            <ul className="analysis-list compact-list">
              {data.extractedItems.map((item) => (
                <li key={item.id}><strong>{item.title}</strong> <span className="status-pill">{item.severity}</span> {item.source}</li>
              ))}
            </ul>
          ) : <div className="placeholder-box">当前还没有提取废标项。</div>}
        </article>
        <article className="stage-card embedded-card">
          <h2>检查结果</h2>
          {data.checkResult ? (
            <div className="analysis-grid single-column-grid no-top-gap">
              <section>
                <h3>废标项风险</h3>
                <RejectionReviewPanel
                  type="rejection"
                  items={data.checkResult.rejection.findings.map((item) => ({
                    id: item.id,
                    title: item.title,
                    summary: item.summary,
                    severity: item.severity,
                    review: item.review,
                    detailLines: [
                      item.requirement ? `招标要求：${item.requirement}` : '',
                      item.bidEvidence ? `投标证据：${item.bidEvidence}` : '',
                      item.riskReason ? `风险原因：${item.riskReason}` : '',
                      item.suggestion ? `建议动作：${item.suggestion}` : '',
                    ].filter(Boolean),
                  }))}
                />
              </section>
              <section>
                <h3>错别字</h3>
                <RejectionReviewPanel
                  type="typo"
                  items={data.checkResult.typo.findings.map((item) => ({
                    id: item.id,
                    title: item.wrongText,
                    review: item.review,
                    detailLines: [
                      item.correctText ? `建议改为：${item.correctText}` : '',
                      item.originalExcerpt ? `原文片段：${item.originalExcerpt}` : '',
                      item.locationHint ? `位置：${item.locationHint}` : '',
                      `原因：${item.reason}`,
                    ].filter(Boolean),
                  }))}
                />
              </section>
              <section>
                <h3>逻辑问题</h3>
                <RejectionReviewPanel
                  type="logic"
                  items={data.checkResult.logic.findings.map((item) => ({
                    id: item.id,
                    title: item.title,
                    review: item.review,
                    detailLines: [
                      item.originalText ? `原问题：${item.originalText}` : '',
                      item.locationHint ? `位置：${item.locationHint}` : '',
                      item.fallacyReason ? `问题原因：${item.fallacyReason}` : '',
                      `建议动作：${item.suggestion}`,
                    ].filter(Boolean),
                  }))}
                />
              </section>
            </div>
          ) : <div className="placeholder-box">当前还没有执行废标项检查。</div>}
        </article>
      </section>
    </main>
  );
}
