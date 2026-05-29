import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '易标 Web 重构版',
  description: '基于 Docling 的纯 Web 标书工作台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
