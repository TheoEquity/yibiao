'use client';

import { ReactNode, useEffect, useState } from 'react';

interface TechnicalPlanTabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface TechnicalPlanTabsProps {
  items: TechnicalPlanTabItem[];
  initialTabId?: string;
}

export function TechnicalPlanTabs({ items, initialTabId }: TechnicalPlanTabsProps) {
  const fallbackTabId = items[0]?.id || '';
  const [activeTabId, setActiveTabId] = useState(initialTabId && items.some((item) => item.id === initialTabId) ? initialTabId : fallbackTabId);

  useEffect(() => {
    function handleHashChange() {
      const tabIdFromHash = window.location.hash.replace('#plan-tab-', '');
      if (items.some((item) => item.id === tabIdFromHash)) {
        setActiveTabId(tabIdFromHash);
      }
    }

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [items]);

  return (
    <section className="plan-tabs" id="plan-tabs">
      <div className="plan-tab-list" role="tablist" aria-label="技术方案阶段页签">
        {items.map((item) => {
          const isActive = item.id === activeTabId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`plan-panel-${item.id}`}
              aria-current={isActive ? 'page' : undefined}
              className={isActive ? 'plan-tab-button active' : 'plan-tab-button'}
              onClick={() => setActiveTabId(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {items.map((item) => {
        const isActive = item.id === activeTabId;
        return (
          <div
            key={item.id}
            id={`plan-panel-${item.id}`}
            role="tabpanel"
            aria-hidden={!isActive}
            hidden={!isActive}
            className="plan-tab-panel"
          >
            <div className="plan-tab-panel-stack">{item.content}</div>
          </div>
        );
      })}
    </section>
  );
}
