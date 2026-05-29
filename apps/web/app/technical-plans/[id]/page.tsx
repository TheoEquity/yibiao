import { AppNav } from '../../../components/app-nav';
import { DocumentIngestSummary } from '../../../components/document-ingest-summary';
import { ExportMetadataForm } from '../../../components/export-metadata-form';
import { ExportDocumentPanel } from '../../../components/export-document-panel';
import { GeneratedContentEditor } from '../../../components/generated-content-editor';
import { KnowledgeReferencePanel } from '../../../components/knowledge-reference-panel';
import { OutlineEditor } from '../../../components/outline-editor';
import { TaskStreamPanel } from '../../../components/task-stream-panel';
import { TenderFileForm } from '../../../components/tender-file-form';
import { TriggerTaskButton } from '../../../components/trigger-task-button';
import { fetchKnowledgeBase, fetchTechnicalPlan } from '../../../lib/api';

const steps = [
  '招标文件',
  '招标分析',
  '目录生成',
  '正文生成',
  '正文编辑',
  '导出',
];

const stepIndexMap: Record<string, number> = {
  'document-analysis': 0,
  'bid-analysis': 1,
  'outline-generation': 2,
  'content-generation': 3,
  editing: 4,
  export: 5,
};

function buildStageStatus(technicalPlan: {
  currentStep: string;
  tenderFile?: { uploadedAt?: string; name?: string } | null;
  parsedDocument?: { metadata?: { fileName?: string }; id?: string } | null;
  bidAnalysis?: { summary?: string; createdAt?: string } | null;
  generatedOutline?: { summary?: string; updatedAt?: string; createdAt?: string } | null;
  generatedContent?: { summary?: string; updatedAt?: string; createdAt?: string } | null;
  exportedDocument?: { summary?: string; generatedAt?: string } | null;
  recentTaskSummaries?: Array<{ taskType: string; summary: string; createdAt: string }>;
}) {
  const activeStepIndex = stepIndexMap[technicalPlan.currentStep] ?? 0;
  const recentSummaryMap = new Map((technicalPlan.recentTaskSummaries || []).map((item) => [item.taskType, item]));

  const stages: Array<{
    id: string;
    label: string;
    status: 'completed' | 'current' | 'pending';
    updatedAt?: string;
    summary?: string;
  }> = [
    {
      id: 'document-analysis',
      label: '招标文件',
      status: technicalPlan.tenderFile ? 'completed' : activeStepIndex === 0 ? 'current' : 'pending',
      updatedAt: recentSummaryMap.get('parse-document')?.createdAt || technicalPlan.tenderFile?.uploadedAt,
      summary: recentSummaryMap.get('parse-document')?.summary || (technicalPlan.tenderFile?.name ? `已导入 ${technicalPlan.tenderFile.name}` : '等待上传招标文件'),
    },
    {
      id: 'bid-analysis',
      label: '招标分析',
      status: technicalPlan.bidAnalysis ? 'completed' : activeStepIndex === 1 ? 'current' : 'pending',
      updatedAt: recentSummaryMap.get('bid-analysis')?.createdAt || technicalPlan.bidAnalysis?.createdAt,
      summary: recentSummaryMap.get('bid-analysis')?.summary || technicalPlan.bidAnalysis?.summary,
    },
    {
      id: 'outline-generation',
      label: '目录生成',
      status: technicalPlan.generatedOutline ? 'completed' : activeStepIndex === 2 ? 'current' : 'pending',
      updatedAt: recentSummaryMap.get('outline-generation')?.createdAt || technicalPlan.generatedOutline?.updatedAt || technicalPlan.generatedOutline?.createdAt,
      summary: recentSummaryMap.get('outline-generation')?.summary || technicalPlan.generatedOutline?.summary,
    },
    {
      id: 'content-generation',
      label: '正文生成',
      status: technicalPlan.generatedContent ? 'completed' : activeStepIndex === 3 ? 'current' : 'pending',
      updatedAt: recentSummaryMap.get('content-generation')?.createdAt || technicalPlan.generatedContent?.updatedAt || technicalPlan.generatedContent?.createdAt,
      summary: recentSummaryMap.get('content-generation')?.summary || technicalPlan.generatedContent?.summary,
    },
    {
      id: 'export',
      label: '导出',
      status: technicalPlan.exportedDocument ? 'completed' : activeStepIndex === 5 ? 'current' : 'pending',
      updatedAt: recentSummaryMap.get('export-document')?.createdAt || technicalPlan.exportedDocument?.generatedAt,
      summary: recentSummaryMap.get('export-document')?.summary || technicalPlan.exportedDocument?.summary,
    },
  ];

  return stages;
}

export default async function TechnicalPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await fetchTechnicalPlan(id);
  const knowledgeBaseResult = await fetchKnowledgeBase();
  const technicalPlan = result.data as {
    id: string;
    title: string;
    currentStep: string;
    status: string;
    tenderFile?: {
      name: string;
      extension: string;
      content: string;
      uploadedAt: string;
      mimeType?: string;
      size?: number;
    } | null;
    parsedDocument?: {
      id: string;
      markdown: string;
      plainText: string;
      outline: Array<{ level: number; title: string }>;
      warnings: string[];
      metadata: {
        fileName: string;
        extension: string;
        parser: string;
      };
    } | null;
    bidAnalysis?: {
      summary: string;
      priorityRequirements: string[];
      risks: string[];
      suggestedOutline: string[];
      evidences?: Array<{ title: string; matchedHeading: string; evidence: string }>;
      createdAt: string;
    } | null;
    knowledgeReferences?: Array<{ id: string; documentId: string; itemId: string; title: string }>;
    exportMetadata?: {
      projectName?: string;
      bidReferenceNo?: string;
      bidderName?: string;
    } | null;
    generatedOutline?: {
      summary: string;
      sections: Array<{
        id: string;
        title: string;
        level: number;
        children?: Array<{
          id: string;
          title: string;
          level: number;
        }>;
      }>;
      createdAt: string;
      updatedAt?: string;
    } | null;
      generatedContent?: {
        summary: string;
        chapters: Array<{
          id: string;
          title: string;
          content: string;
          summary?: string;
          generatedAt?: string;
          updatedAt?: string;
          references?: Array<{ id: string; documentId: string; itemId: string; title: string }>;
        }>;
        createdAt: string;
      updatedAt?: string;
    } | null;
    exportedDocument?: {
      format: string;
      fileName: string;
      summary: string;
      generatedAt: string;
    } | null;
    recentTaskSummaries?: Array<{
      id: string;
      taskType: string;
      summary: string;
      createdAt: string;
    }>;
  };
  const knowledgeBase = knowledgeBaseResult.data as {
    documents: Array<{ id: string; file_name: string }>;
    items: Record<string, Array<{ id: string; title: string }>>;
  };
  const activeStepIndex = stepIndexMap[technicalPlan.currentStep] ?? 0;
  const stageStatus = buildStageStatus(technicalPlan);

  return (
    <main className="detail-shell">
      <AppNav />
      <header className="detail-topbar">
        <div>
          <p className="eyebrow">Technical Plan Workspace</p>
          <h1>{technicalPlan.title}</h1>
          <p>当前步骤：{technicalPlan.currentStep}，状态：{technicalPlan.status}</p>
        </div>
        <div className="topbar-actions">
          <button className="ghost-button" type="button">任务抽屉</button>
          <a className="primary-button topbar-link" href="#export-stage">导出文档</a>
        </div>
      </header>

      <section className="manager-stack">
        <article className="stage-card embedded-card">
          <h2>步骤</h2>
          <ol className="steps-vertical-list">
            {stageStatus.map((stage, index) => (
              <li key={stage.id} className={index === activeStepIndex ? 'active-step' : ''}>
                <span className="step-number">{index + 1}</span>
                <div className="step-sidebar-content">
                  <strong>{stage.label}</strong>
                  {stage.summary ? <em>{stage.summary}</em> : null}
                  {stage.updatedAt ? <small>{new Date(stage.updatedAt).toLocaleString('zh-CN', { hour12: false })}</small> : null}
                </div>
              </li>
            ))}
          </ol>
        </article>

        <article className="stage-card embedded-card">
          <h2>任务状态</h2>
          <TaskStreamPanel resourceType="technical-plan" resourceId={id} recentTaskSummaries={technicalPlan.recentTaskSummaries || []} stageStatus={stageStatus} />
        </article>

        <article className="stage-card embedded-card">
          <h2>招标文件上传与 Docling 解析</h2>
          <p>当前已支持浏览器文件上传、服务端落盘，并按文件类型自动走文本解析或 Docling 解析。</p>
          <TenderFileForm
            technicalPlanId={id}
            initialName={technicalPlan.tenderFile?.name}
            initialContent={technicalPlan.tenderFile?.content}
          />
          <DocumentIngestSummary
            title="招标文件导入信息"
            file={technicalPlan.tenderFile ? {
              name: technicalPlan.tenderFile.name,
              extension: technicalPlan.tenderFile.extension,
              mimeType: technicalPlan.tenderFile.mimeType,
              size: technicalPlan.tenderFile.size,
            } : null}
            parser={technicalPlan.parsedDocument?.metadata.parser}
          />
          <div className="action-row">
            <TriggerTaskButton technicalPlanId={id} taskType="parse-document" label="开始解析" />
            <TriggerTaskButton technicalPlanId={id} taskType="bid-analysis" label="招标分析" />
            <TriggerTaskButton technicalPlanId={id} taskType="outline-generation" label="生成目录" />
            <TriggerTaskButton technicalPlanId={id} taskType="content-generation" label="正文生成" />
          </div>
        </article>

        <article className="stage-card embedded-card">
          <h2>解析结果预览</h2>
          {technicalPlan.parsedDocument ? (
            <div className="parsed-result-block">
              <DocumentIngestSummary
                title="解析结果信息"
                file={{
                  fileName: technicalPlan.parsedDocument.metadata.fileName,
                  extension: technicalPlan.parsedDocument.metadata.extension,
                  warnings: technicalPlan.parsedDocument.warnings,
                }}
                parser={technicalPlan.parsedDocument.metadata.parser}
              />
              <div className="parsed-preview-grid">
                <section>
                  <h3>目录预览</h3>
                  <ul className="outline-list">
                    {technicalPlan.parsedDocument.outline.length > 0 ? technicalPlan.parsedDocument.outline.map((item) => (
                      <li key={`${item.level}-${item.title}`}>
                        <span>H{item.level}</span>
                        <strong>{item.title}</strong>
                      </li>
                    )) : <li>暂无目录结构</li>}
                  </ul>
                </section>
                <section>
                  <h3>Markdown 预览</h3>
                  <pre className="markdown-preview">{technicalPlan.parsedDocument.markdown}</pre>
                </section>
              </div>
            </div>
          ) : (
            <div className="placeholder-box">还没有解析结果，先保存招标文件内容，再触发解析任务。</div>
          )}
        </article>

        <article className="stage-card embedded-card">
          <h2>招标分析结果</h2>
          {technicalPlan.bidAnalysis ? (
            <div className="analysis-block">
              <p className="analysis-summary">{technicalPlan.bidAnalysis.summary}</p>
              <div className="analysis-grid">
                <section>
                  <h3>重点响应项</h3>
                  <ul className="analysis-list">
                    {technicalPlan.bidAnalysis.priorityRequirements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h3>风险提示</h3>
                  <ul className="analysis-list">
                    {technicalPlan.bidAnalysis.risks.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h3>建议目录</h3>
                  <ul className="analysis-list">
                    {technicalPlan.bidAnalysis.suggestedOutline.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h3>证据摘录</h3>
                  <ul className="analysis-list">
                    {(technicalPlan.bidAnalysis.evidences || []).map((item) => (
                      <li key={item.title}>
                        <strong>{item.title}</strong>
                        <div className="muted-text">匹配标题：{item.matchedHeading}</div>
                        <div>{item.evidence}</div>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          ) : (
            <div className="placeholder-box">先完成文档解析，再触发"招标分析"任务生成分析摘要。</div>
          )}
        </article>

        <article className="stage-card embedded-card">
          <h2>目录生成结果</h2>
          {technicalPlan.generatedOutline ? (
            <div className="outline-block">
              <p className="analysis-summary">{technicalPlan.generatedOutline.summary}</p>
              <OutlineEditor
                technicalPlanId={id}
                initialSummary={technicalPlan.generatedOutline.summary}
                initialSections={technicalPlan.generatedOutline.sections}
              />
              <div className="outline-draft-list">
                {technicalPlan.generatedOutline.sections.map((section, index) => (
                  <article key={section.id} className="outline-draft-card">
                    <div className="outline-draft-head">
                      <span>章节 {index + 1}</span>
                      <strong>{section.title}</strong>
                    </div>
                    <ul className="outline-sublist">
                      {(section.children || []).map((child) => (
                        <li key={child.id}>{child.title}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="placeholder-box">先完成招标分析，再触发"生成目录"任务生成目录草稿。</div>
          )}
        </article>

        <article className="stage-card embedded-card">
          <h2>正文生成结果</h2>
          {technicalPlan.generatedContent ? (
            <div className="content-block">
              <p className="analysis-summary">{technicalPlan.generatedContent.summary}</p>
              {(technicalPlan.knowledgeReferences || []).length > 0 ? (
                <div className="reference-summary-box">
                  <strong>当前已引用知识条目</strong>
                  <ul className="analysis-list compact-list">
                    {(technicalPlan.knowledgeReferences || []).map((reference) => (
                      <li key={reference.id}>{reference.title}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="content-draft-list">
                {technicalPlan.generatedContent.chapters.map((chapter) => (
                  <article key={chapter.id} className="content-draft-card">
                    <div className="editor-card-toolbar">
                      <h3>{chapter.title}</h3>
                      <span className="muted-text">最近更新：{chapter.updatedAt || chapter.generatedAt || '未记录'}</span>
                    </div>
                    {chapter.summary ? <p className="muted-text">章节摘要：{chapter.summary}</p> : null}
                    {chapter.references?.length ? (
                      <div className="chapter-reference-block">
                        <span className="muted-text">参考条目</span>
                        <ul className="analysis-list compact-list">
                          {chapter.references.map((reference) => <li key={reference.id}>{reference.title}</li>)}
                        </ul>
                      </div>
                    ) : null}
                    <pre className="content-preview">{chapter.content}</pre>
                    <div className="action-row">
                      <TriggerTaskButton technicalPlanId={id} taskType="export-document" label="重生成此章" variant="ghost" />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="placeholder-box">先完成目录生成，再触发"正文生成"任务生成章节草稿。</div>
          )}
        </article>

        <article className="stage-card embedded-card">
          <h2>正文编辑</h2>
          {technicalPlan.generatedContent ? (
            <GeneratedContentEditor
              technicalPlanId={id}
              initialSummary={technicalPlan.generatedContent.summary}
              initialChapters={technicalPlan.generatedContent.chapters}
              outlineSections={technicalPlan.generatedOutline?.sections.map((section) => ({ id: section.id, title: section.title })) || []}
            />
          ) : (
            <div className="placeholder-box">先完成正文生成，再进入正文编辑和保存。</div>
          )}
        </article>

        <article className="stage-card embedded-card">
          <h2>知识库引用</h2>
          <KnowledgeReferencePanel
            technicalPlanId={id}
            documents={knowledgeBase.documents.map((document) => ({
              ...document,
              items: knowledgeBase.items[document.id] || [],
            }))}
            initialReferences={technicalPlan.knowledgeReferences || []}
          />
        </article>

        <article className="stage-card embedded-card" id="export-stage">
          <h2>导出</h2>
          <ExportMetadataForm technicalPlanId={id} initialValue={technicalPlan.exportMetadata} />
          <ExportDocumentPanel technicalPlanId={id} exportedDocument={technicalPlan.exportedDocument} />
        </article>
      </section>
    </main>
  );
}
