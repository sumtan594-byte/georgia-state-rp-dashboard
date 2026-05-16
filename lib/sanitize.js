export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return html;

  let sanitized = html;

  sanitized = sanitized.replace(/<script[\s>][\s\S]*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<script[^>]*\/>/gi, '');
  sanitized = sanitized.replace(/ on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/ on\w+='[^']*'/gi, '');
  sanitized = sanitized.replace(/ on\w+=\w+/gi, '');
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, '');

  return sanitized;
}
