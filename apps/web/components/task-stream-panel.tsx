'use client';

import { useEffect, useState } from 'react';
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
  const [events, setEvents] = useState<TaskEventItem[]>([]);
  const [status, setStatus] = useState('连接中');

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
      } catch {
        setStatus('事件解析失败');
      }
    };

    return () => source.close();
  }, [resourceId, resourceType]);

  return (
    <article className="side-card">
      <div className="card-head">
        <h2>任务状态</h2>
        <span className="muted-text">{status}</span>
      </div>
      {stageStatus.length > 0 ? (
        <div className="task-stage-block">
          <h3>阶段进度</h3>
          <ul className="task-stage-list">
            {stageStatus.map((stage) => (
              <li key={stage.id} className={`task-stage-item task-stage-${stage.status}`}>
                <div className="task-stage-topline">
                  <strong>{stage.label}</strong>
                  <span className="muted-text">{stage.status === 'completed' ? '已完成' : stage.status === 'current' ? '进行中' : '待开始'}</span>
                </div>
                {stage.summary ? <span>{stage.summary}</span> : null}
                {stage.updatedAt ? <em>{new Date(stage.updatedAt).toLocaleString('zh-CN', { hour12: false })}</em> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {recentTaskSummaries.length > 0 ? (
        <div className="task-stage-block">
          <h3>最近完成</h3>
          <ul className="task-stage-list">
            {recentTaskSummaries.map((item) => (
              <li key={item.id} className="task-stage-item task-stage-completed">
                <div className="task-stage-topline">
                  <strong>{getEventLabel(item.taskType)}</strong>
                  <span className="muted-text">已完成</span>
                </div>
                <span>{item.summary}</span>
                <em>{new Date(item.createdAt).toLocaleString('zh-CN', { hour12: false })}</em>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {events.length === 0 ? (
        <p>等待任务事件。触发解析或分析任务后，这里会实时刷新。</p>
      ) : (
        <ul className="task-event-list">
          {events.map((item) => (
            <li key={`${item.taskId}-${item.emittedAt}`}>
              <div className="task-event-topline">
                <strong>{getEventLabel(item.type)}</strong>
                <span className={`task-event-badge ${getEventTone(item.type)}`}>{String(item.payload.status || 'running')}</span>
              </div>
              <span>{String(item.payload.message || item.payload.status || '任务事件')}</span>
              <em>{new Date(item.emittedAt).toLocaleTimeString('zh-CN', { hour12: false })}</em>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
