import { AppNav } from '../../components/app-nav';
import Link from 'next/link';
import { CreateTechnicalPlanForm } from '../../components/create-technical-plan-form';
import { fetchTechnicalPlans } from '../../lib/api';

export default async function TechnicalPlansPage() {
  const result = await fetchTechnicalPlans();
  const technicalPlans = result.data as Array<{
    id: string;
    title: string;
    status: string;
    currentStep: string;
    updatedAt: string;
  }>;

  return (
    <main className="workspace-shell">
      <AppNav />
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Technical Plans</p>
          <h1>技术方案工作区</h1>
          <p>纯 Web 版主工作台，后续会接入真实 API、任务流和 Docling 解析结果。</p>
        </div>
        <CreateTechnicalPlanForm />
      </header>

      <section className="panel-grid">
        {technicalPlans.map((plan) => (
          <article key={plan.id} className="plan-card">
            <div className="plan-card-head">
              <span className="status-pill">{plan.status}</span>
              <span className="muted-text">{new Date(plan.updatedAt).toLocaleString('zh-CN', { hour12: false })}</span>
            </div>
            <h2>{plan.title}</h2>
            <p>当前步骤：{plan.currentStep}</p>
            <Link className="inline-link" href={`/technical-plans/${plan.id}`}>
              进入工作区
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
