import { useEffect } from 'react';
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import { IconGripVertical, IconPlus } from '@tabler/icons-react';
import { ActionIcon, Group } from '@mantine/core';
import { SlashCommand } from '@/modules/content/editor/SlashCommand';
import { HeroBlock } from '@/modules/content/editor/blocks/HeroBlock';
import { CtaBlock } from '@/modules/content/editor/blocks/CtaBlock';
import { FeaturesBlock } from '@/modules/content/editor/blocks/FeaturesBlock';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

/** What TipTap reports for a document with nothing in it. */
const EMPTY_HTML = '<p></p>';

/**
 * The one editor every page uses — Notion-flavoured: hover a block for a
 * drag handle, type "/" for a block picker, and hero/CTA/features insert as
 * blocks inline rather than living in a separate sections panel.
 *
 * This replaced two editors (a plain TipTap rich-text field and a BlockNote
 * block editor) and the sections rail — one surface, one content shape
 * (HTML), nothing for the user to choose up front.
 */
export function PageBodyEditor({ value, onChange, placeholder = 'Start writing…', minHeight = 480 }: Props) {
  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image,
      Placeholder.configure({ placeholder }),
      SlashCommand,
      HeroBlock,
      CtaBlock,
      FeaturesBlock,
    ],
    content: value,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    const incoming = value || EMPTY_HTML;
    const current = editor.getHTML();
    if (incoming === current) return;
    editor.commands.setContent(value, { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  return (
    <RichTextEditor editor={editor}>
      <RichTextEditor.Toolbar sticky stickyOffset={0}>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Bold />
          <RichTextEditor.Italic />
          <RichTextEditor.Underline />
          <RichTextEditor.Strikethrough />
          <RichTextEditor.ClearFormatting />
          <RichTextEditor.Code />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.H1 />
          <RichTextEditor.H2 />
          <RichTextEditor.H3 />
          <RichTextEditor.H4 />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Blockquote />
          <RichTextEditor.Hr />
          <RichTextEditor.BulletList />
          <RichTextEditor.OrderedList />
          <RichTextEditor.CodeBlock />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Link />
          <RichTextEditor.Unlink />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.AlignLeft />
          <RichTextEditor.AlignCenter />
          <RichTextEditor.AlignJustify />
          <RichTextEditor.AlignRight />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Undo />
          <RichTextEditor.Redo />
        </RichTextEditor.ControlsGroup>
      </RichTextEditor.Toolbar>

      {editor && (
        <DragHandle editor={editor}>
          <Group gap={2} wrap="nowrap">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="Insert block"
              onClick={() => {
                // Opens the same picker "/" does, without making the user type it.
                editor.chain().focus().insertContent('/').run();
              }}
            >
              <IconPlus size={14} />
            </ActionIcon>
            <ActionIcon variant="subtle" color="gray" size="sm" aria-label="Drag to reorder" style={{ cursor: 'grab' }}>
              <IconGripVertical size={14} />
            </ActionIcon>
          </Group>
        </DragHandle>
      )}

      <RichTextEditor.Content
        style={{ minHeight }}
        onClick={() => editor?.commands.focus('end')}
      />
    </RichTextEditor>
  );
}
