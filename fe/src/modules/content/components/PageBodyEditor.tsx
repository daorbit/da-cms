import { useEffect, useRef, useState } from 'react';
import { Box, useMantineColorScheme } from '@mantine/core';
import {
  Editor,
  Transforms,
  type Node as SlateNode,
  type Range as SlateRange,
} from 'slate';
import {
  DaEditor,
  deserializeHtml,
  type DaEditorHandle,
  type MediaKind as EditorMediaKind,
} from 'da-text-editor';
import 'da-text-editor/styles.css';
import { AskAiBar } from './AskAiBar';
import { MediaPickerModal } from '@/modules/media/MediaPickerModal';
import type { MediaKind } from '@/modules/media/mediaService';
import classes from './PageBodyEditor.module.css';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onGeneratingChange?: (generating: boolean) => void;
}

const CONTEXT_LIMIT = 6000;

 
function toLibraryKind(kind: EditorMediaKind): MediaKind {
  if (kind === 'image') return 'image';
  if (kind === 'video' || kind === 'audio') return 'video';
  return 'raw';
}

const BLOCK_INTERVAL_MS = 90;

export function PageBodyEditor({
  value,
  onChange,
  placeholder = 'Start writing…',
  onGeneratingChange,
}: Props) {
  const ref = useRef<DaEditorHandle>(null);
  const lastHtml = useRef(value);
  const aiRange = useRef<SlateRange | null>(null);
  const { colorScheme } = useMantineColorScheme();

 
  const [aiOpen, setAiOpen] = useState(true);
  const [selection, setSelection] = useState('');
  const [typing, setTyping] = useState(false);

 
  const [picking, setPicking] = useState<{
    kind: MediaKind;
    resolve: (v: { url: string; name?: string } | null) => void;
  } | null>(null);

  const pickMedia = (kind: EditorMediaKind) =>
    new Promise<{ url: string; name?: string } | null>((resolve) => {
      setPicking({ kind: toLibraryKind(kind), resolve });
    });

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
    // The range is kept, not just its text: focus moves to the AI bar while the
    // request runs, and `editor.selection` is stale or null by the time the
    // reply needs somewhere to land.
    aiRange.current = editor?.selection ?? null;
    setSelection(selected);
    setAiOpen(true);
  };

 
  const insertHtml = (html: string, mode: 'insert' | 'replace' = 'insert') => {
    const editor = ref.current?.editor;
    if (!editor) return;

    const nodes = deserializeHtml(html);
    if (!nodes.length) return;
 
    if (mode === 'replace') {
      const at = aiRange.current ?? editor.selection;
      if (at) {
        Transforms.select(editor, at);
        Transforms.delete(editor, { at });
        Transforms.insertFragment(editor, nodes as SlateNode[]);
      } else {
        Transforms.insertFragment(editor, nodes as SlateNode[]);
      }
      ref.current?.focus();
      emitChange();
      return;
    }

    setTyping(true);
    onGeneratingChange?.(true);

    let index = 0;
    const timer = setInterval(() => {
      const node = nodes[index];
      index += 1;

      if (node) {
        Transforms.insertNodes(editor, node as SlateNode);
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
          onPickMedia={pickMedia}
          onChange={emitChange}
        />
      </Box>

      <MediaPickerModal
        opened={picking !== null}
        kind={picking?.kind ?? 'image'}
        title={`Choose ${picking?.kind === 'image' ? 'an image' : 'a file'}`}
        onClose={() => {
          picking?.resolve(null);
          setPicking(null);
        }}
        onSelect={(asset) => {
          picking?.resolve({ url: asset.url, name: asset.name });
          setPicking(null);
        }}
      />

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
