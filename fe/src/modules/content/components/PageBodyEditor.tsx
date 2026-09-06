import { useEffect, useRef, useState } from 'react';
import { useMantineColorScheme } from '@mantine/core';
import { Editor, Transforms, type Node as SlateNode } from 'slate';
import { DaEditor, deserializeHtml, type DaEditorHandle } from 'da-text-editor';
import 'da-text-editor/styles.css';
import { AskAiDrawer } from './AskAiDrawer';
import classes from './PageBodyEditor.module.css';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const CONTEXT_LIMIT = 6000;

 
export function PageBodyEditor({ value, onChange, placeholder = 'Start writing…' }: Props) {
  const ref = useRef<DaEditorHandle>(null);
  const lastHtml = useRef(value);
  const { colorScheme } = useMantineColorScheme();

  const [aiOpen, setAiOpen] = useState(false);
  const [selection, setSelection] = useState('');

 
  useEffect(() => {
    if (value === lastHtml.current) return;
    lastHtml.current = value;
    ref.current?.setHTML(value);
  }, [value]);

  const emitChange = () => {
    const html = ref.current?.getHTML({ inlineStyles: true }) ?? '';
    lastHtml.current = html;
    onChange(html);
  };

 
  const openAi = () => {
    const editor = ref.current?.editor;
    const selected = editor?.selection ? Editor.string(editor, editor.selection) : '';
    setSelection(selected);
    setAiOpen(true);
  };

 
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

      <AskAiDrawer
        opened={aiOpen}
        onClose={() => setAiOpen(false)}
        selection={selection}
        context={ref.current?.getText().slice(0, CONTEXT_LIMIT)}
        onInsert={insertHtml}
      />
    </>
  );
}
