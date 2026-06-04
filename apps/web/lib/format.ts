const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour12: false,
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDateTime(value?: string | null) {
  if (!value) {
    return '暂无时间';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '时间格式错误';
  }

  return dateTimeFormatter.format(date);
}
