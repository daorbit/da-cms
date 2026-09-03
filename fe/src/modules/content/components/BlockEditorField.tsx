import { useEffect, useMemo, useRef } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import type { Block, PartialBlock } from '@blocknote/core';

interface Props {
  /** BlockNote's native block tree — the source of truth for this editor. */
  blocks: unknown[];
  onChange: (blocks: Block[], html: string) => void;
  placeholder?: string;
}

const EMPTY_BLOCKS: PartialBlock[] = [{ type: 'paragraph' }];

/**
 * The Notion-style alternative to {@link RichTextField}. Same job — turn the
 * page body into whatever the user typed — but block-native: drag handles,
 * a slash command for inserting blocks, and blocks that sit side by side.
 *
 * Content lives as BlockNote's own JSON (`blocks`), not HTML: that is what
 * preserves block identity across reloads. HTML is derived on every change
 * purely so the rest of the app (preview, anything reading `page.body`) has
 * something to render without knowing about BlockNote.
 */
export function BlockEditorField({ blocks, onChange, placeholder = 'Start writing…' }: Props) {
  const editor = useCreateBlockNote({
    initialContent: (blocks.length ? (blocks as PartialBlock[]) : EMPTY_BLOCKS),
    placeholders: { default: placeholder },
  });

  // Mirrors RichTextField's load-once pattern: push externally-loaded content
  // in only when it actually changed underneath us (page fetch finishing),
  // never in reaction to the user's own typing.
  const loadedRef = useRef(blocks);
  useEffect(() => {
    if (blocks === loadedRef.current) return;
    loadedRef.current = blocks;
    editor.replaceBlocks(editor.document, (blocks.length ? (blocks as PartialBlock[]) : EMPTY_BLOCKS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  const handleChange = useMemo(
    () => async () => {
      const html = await editor.blocksToFullHTML(editor.document);
      onChange(editor.document, html);
    },
    [editor, onChange]
  );

  return <BlockNoteView editor={editor} onChange={handleChange} theme="light" />;
}
