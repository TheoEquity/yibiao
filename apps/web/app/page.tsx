import { AppNav } from '../components/app-nav';

export default function HomePage() {
  return (
    <main className="page-shell">
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <AppNav />
        <section className="hero-card home-hero-card page-section-gap">
          <p className="eyebrow">Docling Web Rebuild</p>
          <h1>易标纯 Web 重构工程</h1>
          <p>
            基于 Docling 的纯 Web 标书工作台，包含技术方案、知识库、查重、废标项检查等核心模块。
          </p>
          <div className="home-module-grid">
            <a href="/technical-plans" className="home-module-card">
              <strong>技术方案</strong>
              <span className="muted-text">从招标文件到技术方案的一键生成与编辑</span>
            </a>
            <a href="/knowledge-base" className="home-module-card">
              <strong>知识库</strong>
              <span className="muted-text">管理企业素材、历史方案与参考文档</span>
            </a>
            <a href="/duplicate-check" className="home-module-card">
              <strong>标书查重</strong>
              <span className="muted-text">检测标书内容重复度与相似度</span>
            </a>
            <a href="/rejection-check" className="home-module-card">
              <strong>废标项检查</strong>
              <span className="muted-text">逐条核对废标条款是否符合要求</span>
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
