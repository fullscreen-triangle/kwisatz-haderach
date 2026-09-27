import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Markdown the node wrote (answers, mail, notes) rendered as sanitised HTML. Links of the
// form read:<kind>/<ref> open the item in the console's reader instead of navigating.

const SAFE_URI = /^(?:(?:https?|mailto|read):|\/|#)/i;

export default function Markdown({ text, onRead }) {
  const html = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const raw = marked.parse(text || '', { gfm: true, breaks: true });
    return DOMPurify.sanitize(raw, { ALLOWED_URI_REGEXP: SAFE_URI });
  }, [text]);

  function click(e) {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href.startsWith('read:')) {
      e.preventDefault();
      const [kind, ...rest] = href.slice(5).split('/');
      onRead?.(kind, rest.join('/'));
    } else if (/^https?:/.test(href)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noreferrer');
    }
  }

  return <div className="md" onClick={click} dangerouslySetInnerHTML={{ __html: html }} />;
}
