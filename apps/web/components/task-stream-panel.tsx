'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CollapsibleSection } from './collapsible-section';
import { getTaskStreamUrl } from '../lib/api';

interface TaskStreamPanelProps {
  resourceType: string;
  resourceId: string;
  recentTaskSummaries?: Array<{
    id: string;
    taskType: string;
    summary: string;
    createdAt: string;
  }>;
  stageStatus?: Array<{
    id: string;
    label: string;
    status: 'completed' | 'current' | 'pending';
    updatedAt?: string;
    summary?: string;
  }>;
}

interface TaskEventItem {
  type: string;
  taskId: string;
  payload: Record<string, unknown>;
  emittedAt: string;
}

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour12: false,
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour12: false,
  timeZone: 'Asia/Shanghai',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function formatTime(value: string) {
  return timeFormatter.format(new Date(value));
}

function getEventTone(type: string) {
  if (type.includes('failed') || type.includes('error')) {
    return 'task-event-error';
  }

  if (type.includes('completed') || type.includes('success')) {
    return 'task-event-success';
  }

  return 'task-event-running';
}

function getEventLabel(type: string) {
  return type
    .split('.')
    .pop()
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || type;
}

export function TaskStreamPanel({ resourceType, resourceId, recentTaskSummaries = [], stageStatus = [] }: TaskStreamPanelProps) {
  const router = useRouter();
  const [events, setEvents] = useState<TaskEventItem[]>([]);
  const [status, setStatus] = useState('连接中');
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedCount = stageStatus.filter((stage) => stage.status === 'completed').length;
  const currentStage = stageStatus.find((stage) => stage.status === 'current');

  useEffect(() => {
    const source = new EventSource(getTaskStreamUrl());

    source.onopen = () => setStatus('已连接');
    source.onerror = () => setStatus('连接异常');
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as TaskEventItem & { resourceType: string; resourceId: string };
        if (data.resourceType !== resourceType || data.resourceId !== resourceId) {
          return;
        }

        setEvents((current) => [
          {
            type: data.type,
            taskId: data.taskId,
            payload: data.payload,
            emittedAt: data.emittedAt,
          },
          ...current,
        ].slice(0, 12));

        const taskStatus = String(data.payload.status || '');
        if (taskStatus === 'success') {
          if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
          }

          // Delay the refresh slightly so the backend has finished persisting derived data.
          refreshTimerRef.current = setTimeout(() => {
            router.refresh();
            refreshTimerRef.current = null;
          }, 300);
        }
      } catch {
        setStatus('事件解析失败');
      }
    };

    return () => {
      source.close();
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [resourceId, resourceType, router]);

  return (
    <article className="side-card">
      <div className="card-head">
        <h2>任务状态</h2>
        <span className="muted-text">{status}</span>
      </div>
      <div className="task-summary-grid">
        <div className="task-summary-card">
          <strong>{completedCount}/{stageStatus.length || 0}</strong>
          <span className="muted-text">阶段完成</span>
        </div>
        <div className="task-summary-card wide">
          <strong>{currentStage?.label || '等待开始'}</strong>
          <span className="muted-text">{currentStage?.summary || '当前没有进行中的阶段'}</span>
        </div>
      </div>
      {recentTaskSummaries.length > 0 ? (
        <CollapsibleSection title="最近完成" summaryExtra={`${recentTaskSummaries.length} 条`} defaultOpen={false}>
          <ul className="task-stage-list compact-stage-list">
            {recentTaskSummaries.slice(0, 4).map((item) => (
              <li key={`${item.id}-${item.taskType}-${item.createdAt}`} className="task-stage-item task-stage-completed">
                <div className="task-stage-topline">
                  <strong>{getEventLabel(item.taskType)}</strong>
                  <span className="muted-text">已完成</span>
                </div>
                <span>{item.summary}</span>
                <em>{formatDateTime(item.createdAt)}</em>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      ) : null}
      <CollapsibleSection title="实时日志" summaryExtra={events.length > 0 ? `${events.length} 条` : '等待中'} defaultOpen={false}>
        {events.length === 0 ? (
          <p>等待任务事件。触发解析或分析任务后，这里会实时刷新。</p>
        ) : (
          <ul className="task-event-list compact-event-list">
            {events.map((item) => (
              <li key={`${item.taskId}-${item.emittedAt}`}>
                <div className="task-event-topline">
                  <strong>{getEventLabel(item.type)}</strong>
                  <span className={`task-event-badge ${getEventTone(item.type)}`}>{String(item.payload.status || 'running')}</span>
                </div>
                <span>{String(item.payload.message || item.payload.status || '任务事件')}</span>
                <em>{formatTime(item.emittedAt)}</em>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>
    </article>
  );
}
