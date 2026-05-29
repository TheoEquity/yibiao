'use client';

import { useState } from 'react';
import { triggerTechnicalPlanTask } from '../lib/api';

interface TriggerTaskButtonProps {
  technicalPlanId: string;
  taskType: 'parse-document' | 'bid-analysis' | 'outline-generation' | 'content-generation' | 'export-document';
  label: string;
  variant?: 'primary' | 'ghost';
}

export function TriggerTaskButton({ technicalPlanId, taskType, label, variant = 'ghost' }: TriggerTaskButtonProps) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');

  async function handleClick() {
    setRunning(true);
    setMessage('');

    try {
      const result = await triggerTechnicalPlanTask(technicalPlanId, taskType);
      setMessage(`任务已创建：${result.data.taskId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '触发失败');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="task-action">
      <button className={variant === 'primary' ? 'primary-button' : 'ghost-button'} type="button" onClick={handleClick} disabled={running}>
        {running ? '提交中...' : label}
      </button>
      {message ? <p className="muted-text">{message}</p> : null}
    </div>
  );
}
