'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { regenerateGeneratedChapter, rewriteGeneratedChapter, saveGeneratedContent } from '../lib/api';

interface ChapterDraft {
  id: string;
  title: string;
  content: string;
  summary?: string;
  generatedAt?: string;
  updatedAt?: string;
  references?: Array<{ id: string; documentId: string; itemId: string; title: string }>;
}

const quickRewriteActions = [
  { label: '扩写', instruction: '请扩写本章内容，补充更多实施细节和响应说明' },
  { label: '压缩', instruction: '请压缩本章内容，保留关键信息并减少重复表述' },
  { label: '正式化', instruction: '请把本章改写得更正式、更适合投标文件语气' },
  { label: '强化交付', instruction: '请强化本章中的交付承诺、保障措施和验收表达' },
];

interface GeneratedContentEditorProps {
  technicalPlanId: string;
  initialSummary: string;
  initialChapters: ChapterDraft[];
  outlineSections?: Array<{ id: string; title: string }>;
}

export function GeneratedContentEditor({ technicalPlanId, initialSummary, initialChapters, outlineSections = [] }: GeneratedContentEditorProps) {
  const router = useRouter();
  const [summary, setSummary] = useState(initialSummary);
  const [chapters, setChapters] = useState(initialChapters);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [rewriteInstructions, setRewriteInstructions] = useState<Record<string, string>>({});

  function updateChapter(index: number, field: 'title' | 'summary' | 'content', value: string) {
    setChapters((current) => current.map((chapter, currentIndex) => (
      currentIndex === index ? { ...chapter, [field]: value, updatedAt: new Date().toISOString() } : chapter
    )));
  }

  function moveChapter(index: number, direction: -1 | 1) {
    setChapters((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [chapter] = next.splice(index, 1);
      next.splice(targetIndex, 0, chapter);
      return next;
    });
  }

  function addChapter() {
    setChapters((current) => ([
      ...current,
        {
          id: `chapter-${Date.now()}`,
          title: `新增章节 ${current.length + 1}`,
          content: '',
          summary: '新增章节，等待补充摘要与正文内容。',
          generatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]));
  }

  function removeChapter(index: number) {
    setChapters((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function rebuildFromOutline() {
    if (outlineSections.length === 0) {
      setMessage('当前没有可用目录，无法重建章节顺序');
      return;
    }

    setChapters((current) => outlineSections.map((section, index) => {
      const matched = current.find((chapter) => chapter.title === section.title);
        return matched || {
          id: `chapter-outline-${section.id || index + 1}`,
          title: section.title,
          content: '',
          summary: `本章围绕“${section.title}”建立了新的编辑骨架。`,
          generatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }));
    setMessage('已按当前目录重建章节顺序');
  }

  async function regenerateChapter(index: number) {
    setSaving(true);
    setMessage('');

    try {
      const chapter = chapters[index];
      const result = await regenerateGeneratedChapter(technicalPlanId, chapter.id);
      const regenerated = result.data as ChapterDraft;
      setChapters((current) => current.map((item, currentIndex) => currentIndex === index ? regenerated : item));
      setMessage(`已重生成章节：${regenerated.title}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '重生成失败');
    } finally {
      setSaving(false);
    }
  }

  async function rewriteChapter(index: number) {
    const chapter = chapters[index];
    const instruction = String(rewriteInstructions[chapter.id] || '').trim();
    if (!instruction) {
      setMessage('请先输入本章改写指令');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const result = await rewriteGeneratedChapter(technicalPlanId, chapter.id, instruction);
      const rewritten = result.data as ChapterDraft;
      setChapters((current) => current.map((item, currentIndex) => currentIndex === index ? rewritten : item));
      setMessage(`已按指令改写章节：${rewritten.title}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '改写失败');
    } finally {
      setSaving(false);
    }
  }

  async function applyQuickRewrite(index: number, instruction: string) {
    const chapter = chapters[index];
    setRewriteInstructions((current) => ({ ...current, [chapter.id]: instruction }));
    setSaving(true);
    setMessage('');

    try {
      const result = await rewriteGeneratedChapter(technicalPlanId, chapter.id, instruction);
      const rewritten = result.data as ChapterDraft;
      setChapters((current) => current.map((item, currentIndex) => currentIndex === index ? rewritten : item));
      setMessage(`已完成快捷改写：${rewritten.title}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '改写失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await saveGeneratedContent(technicalPlanId, { summary, chapters });
      setMessage('正文草稿已保存');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="editor-form" onSubmit={handleSubmit}>
      <div className="field-group">
        <label htmlFor="content-summary">正文摘要</label>
        <textarea
          id="content-summary"
          className="textarea-input compact-textarea"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
        />
      </div>
      <div className="editor-chapter-list">
        {chapters.map((chapter, index) => (
          <article key={chapter.id} className="editor-chapter-card">
            <div className="editor-card-toolbar">
              <strong>章节 {index + 1}</strong>
              <div className="action-row">
                <button className="ghost-button" type="button" onClick={() => moveChapter(index, -1)} disabled={index === 0}>上移</button>
                <button className="ghost-button" type="button" onClick={() => moveChapter(index, 1)} disabled={index === chapters.length - 1}>下移</button>
                <button className="ghost-button" type="button" onClick={() => regenerateChapter(index)} disabled={saving}>重生成本章</button>
                <button className="ghost-button" type="button" onClick={() => rewriteChapter(index)} disabled={saving}>按指令改写</button>
                <button className="ghost-button" type="button" onClick={() => removeChapter(index)} disabled={chapters.length === 1}>删除</button>
              </div>
            </div>
            <div className="field-group">
              <label htmlFor={`chapter-title-${chapter.id}`}>章节标题 {index + 1}</label>
              <input
                id={`chapter-title-${chapter.id}`}
                className="text-input"
                type="text"
                value={chapter.title}
                onChange={(event) => updateChapter(index, 'title', event.target.value)}
              />
            </div>
            <div className="field-group">
              <label htmlFor={`chapter-rewrite-${chapter.id}`}>本章改写指令</label>
              <input
                id={`chapter-rewrite-${chapter.id}`}
                className="text-input"
                type="text"
                placeholder="例如：强化交付承诺，语气更正式"
                value={rewriteInstructions[chapter.id] || ''}
                onChange={(event) => setRewriteInstructions((current) => ({ ...current, [chapter.id]: event.target.value }))}
              />
            </div>
            <div className="field-group">
              <label htmlFor={`chapter-summary-${chapter.id}`}>章节摘要</label>
              <textarea
                id={`chapter-summary-${chapter.id}`}
                className="textarea-input compact-textarea"
                value={chapter.summary || ''}
                onChange={(event) => updateChapter(index, 'summary', event.target.value)}
                placeholder="概括本章重点响应内容、实施主线或交付承诺"
              />
            </div>
            <div className="quick-action-row">
              {quickRewriteActions.map((action) => (
                <button
                  key={action.label}
                  className="ghost-button"
                  type="button"
                  onClick={() => applyQuickRewrite(index, action.instruction)}
                  disabled={saving}
                >
                  {action.label}
                </button>
              ))}
            </div>
            <div className="field-group">
              <label htmlFor={`chapter-content-${chapter.id}`}>章节内容</label>
              <textarea
                id={`chapter-content-${chapter.id}`}
                className="textarea-input chapter-textarea"
                value={chapter.content}
                onChange={(event) => updateChapter(index, 'content', event.target.value)}
              />
            </div>
          </article>
        ))}
      </div>
      <div className="action-row">
        <button className="ghost-button" type="button" onClick={rebuildFromOutline}>按目录重建顺序</button>
        <button className="ghost-button" type="button" onClick={addChapter}>新增章节</button>
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? '保存中...' : '保存正文草稿'}
        </button>
      </div>
      {message ? <p className="muted-text">{message}</p> : null}
    </form>
  );
}
