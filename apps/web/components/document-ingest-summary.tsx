'use client';

interface DocumentIngestSummaryProps {
  title?: string;
  file?: {
    fileName?: string;
    name?: string;
    extension?: string;
    mimeType?: string;
    mime_type?: string;
    size?: number;
    warnings?: string[];
  } | null;
  parser?: string;
}

function formatFileSize(size?: number) {
  if (!size || size <= 0) {
    return '未记录';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentIngestSummary({ title = '导入摘要', file, parser }: DocumentIngestSummaryProps) {
  if (!file) {
    return <div className="placeholder-box">当前还没有导入文件。</div>;
  }

  const fileName = file.fileName || file.name || '未命名文件';
  const mimeType = file.mimeType || file.mime_type || '未记录';
  const warnings = file.warnings || [];

  return (
    <div className="document-summary-block">
      <h3>{title}</h3>
      <div className="document-summary-grid">
        <span>文件名：{fileName}</span>
        <span>扩展名：{file.extension || '未记录'}</span>
        <span>MIME：{mimeType}</span>
        <span>大小：{formatFileSize(file.size)}</span>
        <span>解析器：{parser || (file.extension && ['.md', '.markdown', '.txt', '.json', '.csv'].includes(file.extension) ? 'text' : 'docling')}</span>
      </div>
      {warnings.length > 0 ? (
        <div className="warning-box compact-warning-box">
          <strong>解析提示</strong>
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
