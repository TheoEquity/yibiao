"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { regenerateGeneratedChapter } from '../lib/api';

interface RegenerateChapterButtonProps {
  technicalPlanId: string;
  chapterId: string;
}

export function RegenerateChapterButton({ technicalPlanId, chapterId }: RegenerateChapterButtonProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function handleClick() {
    setRunning(true);

    try {
      await regenerateGeneratedChapter(technicalPlanId, chapterId);
      router.refresh();
    } finally {
      setRunning(false);
    }
  }

  return (
    <button className="ghost-button" type="button" onClick={handleClick} disabled={running}>
      {running ? '重生成中...' : '重生成此章'}
    </button>
  );
}
