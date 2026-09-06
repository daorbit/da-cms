import { useEffect, useRef, useState } from 'react';
import { Box, useMantineColorScheme } from '@mantine/core';
import { Editor, Transforms, type Node as SlateNode } from 'slate';
import { DaEditor, deserializeHtml, type DaEditorHandle } from 'da-text-editor';
import 'da-text-editor/styles.css';
import { AskAiBar } from './AskAiBar';
import classes from './PageBodyEditor.module.css';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Raised while Orbit is writing, so the page can lock saving. */
  onGeneratingChange?: (generating: boolean) => void;
}

const CONTEXT_LIMIT = 6000;

/** How long each generated block takes to appear. Fast enough not to be a wait. */
const BLOCK_INTERVAL_MS = 90;

export function PageBodyEditor({
  value,
  onChange,
  placeholder = 'Start writing…',
  onGeneratingChange,
}: Props) {
  const ref = useRef<DaEditorHandle>(null);
  const lastHtml = useRef(value);
  const { colorScheme } = useMantineColorScheme();

  const [aiOpen, setAiOpen] = useState(false);
  const [selection, setSelection] = useState('');
  const [typing, setTyping] = useState(false);

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

  /**
   * Types the generated content in a block at a time.
   *
   * The model answers all at once, so this is presentation rather than real
   * streaming — but dropping a finished article in on one frame reads as a
   * paste and gives no sense that anything was written. Block by block, the
   * document fills the way someone would write it, and the writer can read what
   * is arriving while it arrives.
   */
  const insertHtml = (html: string) => {
    const editor = ref.current?.editor;
    if (!editor) return;

    const nodes = deserializeHtml(html);
    if (!nodes.length) return;

    setTyping(true);
    onGeneratingChange?.(true);

    let index = 0;
    const timer = setInterval(() => {
      const node = nodes[index];
      index += 1;

      if (node) {
        Transforms.insertNodes(editor, node as SlateNode);
        // Keeps the newest block in view, so a long piece does not write itself
        // off the bottom of the screen.
        ref.current?.focus();
      }

      if (index >= nodes.length) {
        clearInterval(timer);
        emitChange();
        setTyping(false);
        onGeneratingChange?.(false);
      }
    }, BLOCK_INTERVAL_MS);
  };

  return (
    <Box className={classes.wrap}>
      {/* While Orbit is typing the surface is read-only: an edit landing between
          two inserted blocks would be overwritten by the next one. */}
      <Box className={classes.surface} data-typing={typing || undefined}>
        <DaEditor
          ref={ref}
          className={classes.editor}
          defaultHtml={value}
          theme={colorScheme === 'auto' ? 'system' : colorScheme}
          placeholder={placeholder}
          onAskAi={openAi}
          onChange={emitChange}
        />
      </Box>

      <AskAiBar
        opened={aiOpen}
        onClose={() => setAiOpen(false)}
        selection={selection}
        context={ref.current?.getText().slice(0, CONTEXT_LIMIT)}
        onInsert={insertHtml}
        onGeneratingChange={(g) => onGeneratingChange?.(g)}
      />
    </Box>
  );
}
