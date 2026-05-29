'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { saveGeneratedOutline } from '../lib/api';

interface OutlineSection {
  id: string;
  title: string;
  level: number;
  children?: Array<{ id: string; title: string; level: number }>;
}

interface OutlineEditorProps {
  technicalPlanId: string;
  initialSummary: string;
  initialSections: OutlineSection[];
}

export function OutlineEditor({ technicalPlanId, initialSummary, initialSections }: OutlineEditorProps) {
  const router = useRouter();
  const [summary, setSummary] = useState(initialSummary);
  const [sections, setSections] = useState(initialSections);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function updateSection(index: number, value: string) {
    setSections((current) => current.map((section, currentIndex) => (
      currentIndex === index ? { ...section, title: value } : section
    )));
  }

  function updateChild(sectionIndex: number, childIndex: number, value: string) {
    setSections((current) => current.map((section, currentSectionIndex) => {
      if (currentSectionIndex !== sectionIndex) {
        return section;
      }

      return {
        ...section,
        children: (section.children || []).map((child, currentChildIndex) => (
          currentChildIndex === childIndex ? { ...child, title: value } : child
        )),
      };
    }));
  }

  function addChild(sectionIndex: number) {
    setSections((current) => current.map((section, currentIndex) => {
      if (currentIndex !== sectionIndex) {
        return section;
      }

      const nextChildren = [...(section.children || [])];
      nextChildren.push({
        id: `child-${Date.now()}-${sectionIndex + 1}`,
        title: `新增子章节 ${nextChildren.length + 1}`,
        level: 2,
      });

      return {
        ...section,
        children: nextChildren,
      };
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await saveGeneratedOutline(technicalPlanId, { summary, sections });
      setMessage('目录草稿已保存');
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
        <label htmlFor="outline-summary">目录摘要</label>
        <textarea id="outline-summary" className="textarea-input compact-textarea" value={summary} onChange={(event) => setSummary(event.target.value)} />
      </div>
      <div className="editor-chapter-list">
        {sections.map((section, sectionIndex) => (
          <article key={section.id} className="editor-chapter-card">
            <div className="editor-card-toolbar">
              <strong>章节 {sectionIndex + 1}</strong>
              <button className="ghost-button" type="button" onClick={() => addChild(sectionIndex)}>新增子章节</button>
            </div>
            <div className="field-group">
              <label htmlFor={`section-title-${section.id}`}>一级章节 {sectionIndex + 1}</label>
              <input id={`section-title-${section.id}`} className="text-input" type="text" value={section.title} onChange={(event) => updateSection(sectionIndex, event.target.value)} />
            </div>
            {(section.children || []).map((child, childIndex) => (
              <div className="field-group" key={child.id}>
                <label htmlFor={`child-title-${child.id}`}>子章节 {sectionIndex + 1}.{childIndex + 1}</label>
                <input id={`child-title-${child.id}`} className="text-input" type="text" value={child.title} onChange={(event) => updateChild(sectionIndex, childIndex, event.target.value)} />
              </div>
            ))}
          </article>
        ))}
      </div>
      <div className="action-row">
        <button className="primary-button" type="submit" disabled={saving}>{saving ? '保存中...' : '保存目录草稿'}</button>
      </div>
      {message ? <p className="muted-text">{message}</p> : null}
    </form>
  );
}
