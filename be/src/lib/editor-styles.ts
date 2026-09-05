import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * The editor serializes to HTML that carries its own `da-*` classes — tables,
 * callouts, to-do items, code blocks and mentions all render as plain blocks
 * without the stylesheet that defines them. Published content therefore has to
 * ship the same CSS the editor uses, so we read it straight out of the package
 * once at startup and inline it into the rendered document.
 */
export const editorStyles = (() => {
  try {
    return readFileSync(require.resolve('da-text-editor/styles.css'), 'utf8');
  } catch {
    return '';
  }
})();
