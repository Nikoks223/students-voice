import DOMPurify from 'dompurify';

// Allow-list tuned to what the TipTap editor can actually produce
// (StarterKit + link + image + mention). Anything outside this is stripped,
// which neutralises stored-XSS payloads written directly to Firestore.
const CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'code', 'pre',
    'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4',
    'a', 'img', 'span', 'hr',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'data-id', 'data-type', 'target', 'rel'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#)/i,
  ADD_ATTR: ['target'],
};

// Force any anchor that survives sanitisation to open safely.
let hookInstalled = false;
function ensureHook() {
  if (hookInstalled) return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.getAttribute('href')) {
      const href = node.getAttribute('href');
      // External links open in a new, isolated tab.
      if (/^https?:/i.test(href)) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer nofollow');
      }
    }
  });
  hookInstalled = true;
}

/**
 * Sanitise user-generated HTML before it is injected with
 * dangerouslySetInnerHTML. Returns a safe HTML string.
 */
export function sanitizeHtml(dirty) {
  if (!dirty) return '';
  ensureHook();
  return DOMPurify.sanitize(dirty, CONFIG);
}
