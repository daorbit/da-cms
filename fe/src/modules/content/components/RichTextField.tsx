import { useEffect } from 'react';
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Input } from '@mantine/core';

interface Props {
  label?: string;
  description?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

/** What TipTap reports for a document with nothing in it. */
const EMPTY_HTML = '<p></p>';

export function RichTextField({
  label,
  description,
  value,
  onChange,
  placeholder = 'Write something…',
  minHeight = 360,
}: Props) {
  const editor = useEditor({
    // Without this the toolbar never re-renders, so the active states on Bold,
    // the headings and the alignment controls stay stuck at their initial value.
    shouldRerenderOnTransaction: true,
    extensions: [
      // StarterKit v3 bundles Link and Underline. Its Link is disabled so the
      // Mantine one — which the toolbar's Link control drives — owns the mark;
      // registering both throws a duplicate-extension warning and the controls
      // then act on the wrong instance.
      StarterKit.configure({ link: false }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  });

  // Push externally-loaded content in once — when the page finishes fetching.
  //
  // The comparison has to treat "" and "<p></p>" as the same thing: an empty
  // editor reports the latter, so a plain inequality check fires setContent on
  // every keystroke of the first word and wipes what was just typed.
  useEffect(() => {
    if (!editor) return;

    const incoming = value || EMPTY_HTML;
    const current = editor.getHTML();
    if (incoming === current) return;

    editor.commands.setContent(value, { emitUpdate: false });
    // `editor.getHTML()` is deliberately not a dependency: it changes on every
    // keystroke and would make this run against the user's own typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  const body = (
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

      {/* The click target is the whole area, not just the text: clicking the
          empty space below a short paragraph should put the caret at the end,
          which is what every other editor does. */}
      <RichTextEditor.Content
        style={{ minHeight }}
        onClick={() => editor?.commands.focus('end')}
      />
    </RichTextEditor>
  );

  if (!label) return body;

  return (
    <Input.Wrapper label={label} description={description}>
      {body}
    </Input.Wrapper>
  );
}
