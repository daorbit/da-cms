import { useEffect } from 'react';
import { useComputedColorScheme } from '@mantine/core';
import { EditorContent, EditorContext, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TextAlign } from '@tiptap/extension-text-align';
import { Typography } from '@tiptap/extension-typography';
import { Highlight } from '@tiptap/extension-highlight';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Selection } from '@tiptap/extensions';
import { DragHandle } from '@tiptap/extension-drag-handle-react';

// Tiptap's own UI components (installed as source via `npx @tiptap/cli add
// simple-editor`, MIT licensed). Only the node styling and the floating
// selection toolbar are used — no fixed top toolbar, all formatting happens
// through the bubble menu that appears over a selection.
import { HorizontalRule } from '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension';
import '@/components/tiptap-node/blockquote-node/blockquote-node.scss';
import '@/components/tiptap-node/code-block-node/code-block-node.scss';
import '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss';
import '@/components/tiptap-node/list-node/list-node.scss';
import '@/components/tiptap-node/image-node/image-node.scss';
import '@/components/tiptap-node/heading-node/heading-node.scss';
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss';
import '@/components/tiptap-templates/simple/simple-editor.scss';

import { SlashCommand } from '@/modules/content/editor/SlashCommand';
import { SelectionToolbar } from '@/modules/content/editor/SelectionToolbar';
import { HeroBlock } from '@/modules/content/editor/blocks/HeroBlock';
import { CtaBlock } from '@/modules/content/editor/blocks/CtaBlock';
import { FeaturesBlock } from '@/modules/content/editor/blocks/FeaturesBlock';
import { IconGripVertical, IconPlus } from '@tabler/icons-react';
import { ActionIcon, Group } from '@mantine/core';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/** What TipTap reports for a document with nothing in it. */
const EMPTY_HTML = '<p></p>';

/**
 * The one editor every page uses. Built on Tiptap's own "Simple Editor" UI
 * components (installed as source, MIT licensed — same look as their docs
 * site) plus this app's own additions: a drag handle with a slash-command
 * trigger, and Hero/CTA/Features as inline blocks so nothing needs a
 * separate sections panel any more.
 */
export function PageBodyEditor({ value, onChange, placeholder = 'Start writing…' }: Props) {
  // The vendored Tiptap components theme off an ancestor `.dark` class
  // (their own toggle, which this app doesn't use) rather than Mantine's
  // color scheme. Popups (slash menu, bubble menu, drag handle) render via
  // portal to document.body, outside this component's own DOM subtree, so
  // the class has to live on <body> to reach them — a plain class name,
  // separate from Mantine's `data-mantine-color-scheme` attribute, so the
  // two don't collide.
  const colorScheme = useComputedColorScheme('light');
  useEffect(() => {
    document.body.classList.toggle('dark', colorScheme === 'dark');
  }, [colorScheme]);

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: 'off',
        autocorrect: 'off',
        autocapitalize: 'off',
        'aria-label': 'Page body, start typing to enter text.',
        class: 'simple-editor',
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: { openOnClick: false, enableClickSelection: true },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      Placeholder.configure({ placeholder }),
      SlashCommand,
      HeroBlock,
      CtaBlock,
      FeaturesBlock,
    ],
    content: value,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  });

  // Load externally-fetched content in once. "" and "<p></p>" both mean an
  // empty editor, so the comparison treats them the same — otherwise a plain
  // inequality check would fire setContent on every keystroke of the first
  // word and wipe out what was just typed.
  useEffect(() => {
    if (!editor) return;
    const incoming = value || EMPTY_HTML;
    const current = editor.getHTML();
    if (incoming === current) return;
    editor.commands.setContent(value, { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  return (
    <div className="simple-editor-wrapper page-body-editor">
      <EditorContext.Provider value={{ editor }}>
        {editor && (
          <SelectionToolbar
            editor={editor}
            onAiAction={(action, { option }) => {
              // Placeholder until this app's own AI writing feature ships —
              // keeps every menu item real rather than dead, without a
              // backend to call yet.
              // eslint-disable-next-line no-console
              console.info('AI action (not wired up yet):', action, option ?? '');
            }}
          />
        )}

        {editor && (
          <DragHandle editor={editor}>
            <Group gap={2} wrap="nowrap">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label="Insert block"
                onClick={() => editor.chain().focus().insertContent('/').run()}
              >
                <IconPlus size={14} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label="Drag to reorder"
                style={{ cursor: 'grab' }}
              >
                <IconGripVertical size={14} />
              </ActionIcon>
            </Group>
          </DragHandle>
        )}

        <EditorContent editor={editor} role="presentation" className="simple-editor-content" />
      </EditorContext.Provider>
    </div>
  );
}
