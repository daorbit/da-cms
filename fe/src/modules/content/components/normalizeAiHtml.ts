const INLINE_ONLY = 'li, blockquote, th, td, [data-callout], [data-todo]';

const CALLOUT_VARIANTS = ['info', 'warning', 'success', 'danger'];

const CALLOUT_EMOJI: Record<string, string> = {
  info: '💡',
  success: '✅',
  warning: '⚠️',
  danger: '🚫',
};

/** Replaces an element with its children, keeping their order. */
function unwrap(el: Element) {
  el.replaceWith(...Array.from(el.childNodes));
}

/**
 * Block-level children inside an inline-only block become inline text joined by
 * line breaks, since the editor would otherwise nest a paragraph in a list item.
 */
function flattenToInline(el: Element) {
  const blocks = Array.from(el.children).filter((c) =>
    /^(P|DIV|H[1-6])$/.test(c.nodeName) && !c.hasAttribute('data-callout')
  );
  blocks.forEach((block, i) => {
    if (i > 0) block.before(el.ownerDocument.createElement('br'));
    unwrap(block);
  });
}

/**
 * Brings model output in line with the shapes `deserializeHtml` understands
 * before it is turned into editor nodes.
 */
export function normalizeAiHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.body;

  root.querySelectorAll('article, section, main, header, footer, span:not([class])').forEach(unwrap);

  root.querySelectorAll('h1').forEach((h1) => {
    const h2 = doc.createElement('h2');
    h2.append(...Array.from(h1.childNodes));
    h1.replaceWith(h2);
  });

  root.querySelectorAll('[data-callout]').forEach((el) => {
    const variant = el.getAttribute('data-callout') ?? '';
    const safe = CALLOUT_VARIANTS.includes(variant) ? variant : 'info';
    el.setAttribute('data-callout', safe);
    if (!el.getAttribute('data-emoji')) el.setAttribute('data-emoji', CALLOUT_EMOJI[safe]);
  });

  root.querySelectorAll('li ul, li ol').forEach((nested) => {
    const li = nested.closest('li');
    nested.remove();
    if (li) li.after(...Array.from(nested.children));
  });

  root.querySelectorAll(INLINE_ONLY).forEach(flattenToInline);

  root.querySelectorAll('p').forEach((p) => {
    if (!p.textContent?.trim() && !p.querySelector('img')) p.remove();
  });

  return root.innerHTML;
}
