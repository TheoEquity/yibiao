from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from docling.document_converter import DocumentConverter
import json
import sys


@dataclass
class ParsedDocumentResult:
    markdown: str
    plainText: str
    outline: list
    tables: list
    assets: list
    metadata: dict
    warnings: list


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_outline(markdown: str) -> list:
    outline = []
    for line in markdown.splitlines():
        if line.startswith('#'):
            level = len(line) - len(line.lstrip('#'))
            title = line[level:].strip()
            if title:
                outline.append({'level': level, 'title': title})
    return outline


def parse_document(file_path: str, parser: str = 'docling') -> dict:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f'file not found: {file_path}')

    if path.suffix.lower() in {'.md', '.markdown', '.txt'}:
        content = path.read_text(encoding='utf-8')
        result = ParsedDocumentResult(
            markdown=content,
            plainText=content,
            outline=build_outline(content),
            tables=[],
            assets=[],
            metadata={
                'fileName': path.name,
                'extension': path.suffix.lower(),
                'parser': 'text',
            },
            warnings=[],
        )
        return asdict(result)

    warnings = []

    try:
        converter = DocumentConverter()
        conversion_result = converter.convert(str(path))
        document = conversion_result.document
        markdown = document.export_to_markdown()
        plain_text = markdown
        result = ParsedDocumentResult(
            markdown=markdown,
            plainText=plain_text,
            outline=build_outline(markdown),
            tables=[],
            assets=[],
            metadata={
                'fileName': path.name,
                'extension': path.suffix.lower(),
                'parser': parser,
                'hasOcr': False,
            },
            warnings=warnings,
        )
        return asdict(result)
    except Exception as error:
        warnings.append(f'Docling 解析失败，已回退占位结果：{error}')
        result = ParsedDocumentResult(
            markdown='# 解析占位\n\n当前文档未完成真实解析。',
            plainText='Document parse fallback placeholder.',
            outline=[{'level': 1, 'title': '解析占位'}],
            tables=[],
            assets=[],
            metadata={
                'fileName': path.name,
                'extension': path.suffix.lower(),
                'parser': parser,
                'hasOcr': False,
            },
            warnings=warnings,
        )
        return asdict(result)


if __name__ == '__main__':
    if len(sys.argv) >= 2:
        file_path = sys.argv[1]
        parser = sys.argv[2] if len(sys.argv) >= 3 else 'docling'
        print(json.dumps({
            'success': True,
            'generatedAt': now_iso(),
            'data': parse_document(file_path, parser=parser),
        }, ensure_ascii=False))
    else:
        sample_path = Path(__file__).resolve()
        print(json.dumps({
            'taskType': 'document-parse',
            'generatedAt': now_iso(),
            'sample': parse_document(str(sample_path), parser='docling'),
        }, ensure_ascii=False, indent=2))
