import Link from 'next/link';
import Image from 'next/image';

const navItems = [
  { href: '/', label: '总览' },
  { href: '/technical-plans', label: '技术方案' },
  { href: '/knowledge-base', label: '知识库' },
  { href: '/duplicate-check', label: '标书查重' },
  { href: '/rejection-check', label: '废标项检查' },
  { href: '/settings', label: '设置' },
];

export function AppNav() {
  return (
    <nav className="app-nav">
      <div className="app-nav-brand">
        <Image src="/logo.jpg" alt="LOGO" width={100} height={40} style={{ objectFit: 'contain' }} />
        <span>Docling 重构版</span>
      </div>
      <div className="app-nav-links">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="app-nav-link">
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
