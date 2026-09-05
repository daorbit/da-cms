import { useEffect, useRef, useState } from 'react';
import { useMantineColorScheme } from '@mantine/core';
import { Editor, Transforms, type Node as SlateNode } from 'slate';
import { DaEditor, deserializeHtml, type DaEditorHandle } from 'da-text-editor';
import 'da-text-editor/styles.css';
import { AskAiModal } from './AskAiModal';
import classes from './PageBodyEditor.module.css';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/** How much of the document the model gets as context, in characters. */
const CONTEXT_LIMIT = 6000;

/**
 * Rich body field backed by `da-text-editor`. It keeps the same
 * `value` / `onChange` HTML string contract every caller and the preview
 * already expect, so nothing downstream changes.
 */
export function PageBodyEditor({ value, onChange, placeholder = 'Start writing…' }: Props) {
  const ref = useRef<DaEditorHandle>(null);
  const lastHtml = useRef(value);
  const { colorScheme } = useMantineColorScheme();

  const [aiOpen, setAiOpen] = useState(false);
  const [selection, setSelection] = useState('');

  // The editor owns its document, so only push in changes that did not
  // originate here (page load, discard, switching pages).
  useEffect(() => {
    if (value === lastHtml.current) return;
    lastHtml.current = value;
    ref.current?.setHTML(value);
  }, [value]);

  const emitChange = () => {
    const html = ref.current?.getHTML() ?? '';
    lastHtml.current = html;
    onChange(html);
  };

  // Read the selection before the modal opens: focus moves to the dialog, and
  // by the time the request is sent the editor no longer has one.
  const openAi = () => {
    const editor = ref.current?.editor;
    const selected = editor?.selection ? Editor.string(editor, editor.selection) : '';
    setSelection(selected);
    setAiOpen(true);
  };

  /**
   * Generated content lands at the cursor, replacing the selection when the
   * writer had one — the same shape as pasting, which is what "write this for
   * me" turns out to mean in use. The editor's own parser turns the fragment
   * into nodes, so headings, tables and marks arrive intact.
   */
  const insertHtml = (html: string) => {
    const editor = ref.current?.editor;
    if (!editor) return;

    const nodes = deserializeHtml(html);
    if (!nodes.length) return;

    Transforms.insertNodes(editor, nodes as SlateNode[]);
    emitChange();
    ref.current?.focus();
  };

  return (
    <>
      <DaEditor
        ref={ref}
        className={classes.editor}
        defaultHtml={value}
        theme={colorScheme === 'auto' ? 'system' : colorScheme}
        placeholder={placeholder}
        onAskAi={openAi}
        onChange={emitChange}
      />

      <AskAiModal
        opened={aiOpen}
        onClose={() => setAiOpen(false)}
        selection={selection}
        context={ref.current?.getText().slice(0, CONTEXT_LIMIT)}
        onInsert={insertHtml}
      />
    </>
  );
}
