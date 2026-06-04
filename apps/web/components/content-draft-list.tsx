'use client';

import { CollapsibleSection } from './collapsible-section';
import { RegenerateChapterButton } from './regenerate-chapter-button';

interface ChapterDraft {
  id: string;
  title: string;
  content: string;
  summary?: string;
  generatedAt?: string;
  updatedAt?: string;
  references?: Array<{ id: string; documentId: string; itemId: string; title: string }>;
}

interface ContentDraftListProps {
  technicalPlanId: string;
  chapters: ChapterDraft[];
}

export function ContentDraftList({ technicalPlanId, chapters }: ContentDraftListProps) {
  return (
    <div className="content-draft-list">
      {chapters.map((chapter, index) => (
        <article key={chapter.id} className="content-draft-card">
          <CollapsibleSection
            title={chapter.title}
            defaultOpen={index === 0}
            summaryExtra={<span>章节 {index + 1}</span>}
          >
            <div className="editor-card-toolbar compact-toolbar">
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
              <RegenerateChapterButton technicalPlanId={technicalPlanId} chapterId={chapter.id} />
            </div>
          </CollapsibleSection>
        </article>
      ))}
    </div>
  );
}
