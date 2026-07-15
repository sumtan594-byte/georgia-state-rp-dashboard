import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'b', 'i', 'em', 'strong', 'u', 's', 'strike', 'code', 'pre', 'br',
  'p', 'span', 'div', 'a', 'ul', 'ol', 'li', 'blockquote',
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'class'];

export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return html;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

export function sanitizeText(text) {
  if (!text || typeof text !== 'string') return text;
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
