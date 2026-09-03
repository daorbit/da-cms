import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import type { Editor, Range } from '@tiptap/core';
import { Paper, Stack, Text, UnstyledButton, Group, ThemeIcon } from '@mantine/core';
import {
  IconH1, IconH2, IconH3, IconList, IconListNumbers, IconQuote, IconCode, IconPhoto,
  IconLayoutList, IconClick, IconListDetails, IconMinus,
} from '@tabler/icons-react';
import {
  forwardRef, useEffect, useImperativeHandle, useState,
} from 'react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/shift-away.css';
import 'tippy.js/themes/light-border.css';

interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (opts: { editor: Editor; range: Range }) => void;
}

const ITEMS: CommandItem[] = [
  {
    title: 'Heading 1', description: 'Big section heading', icon: <IconH1 size={16} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    title: 'Heading 2', description: 'Medium section heading', icon: <IconH2 size={16} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    title: 'Heading 3', description: 'Small section heading', icon: <IconH3 size={16} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    title: 'Bullet list', description: 'A simple bulleted list', icon: <IconList size={16} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: 'Numbered list', description: 'A list with numbering', icon: <IconListNumbers size={16} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: 'Quote', description: 'Capture a quote', icon: <IconQuote size={16} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: 'Code block', description: 'A block of code', icon: <IconCode size={16} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: 'Divider', description: 'A horizontal line', icon: <IconMinus size={16} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: 'Image', description: 'Insert an image by URL', icon: <IconPhoto size={16} />,
    command: ({ editor, range }) => {
      const url = window.prompt('Image URL');
      if (!url) {
        editor.chain().focus().deleteRange(range).run();
        return;
      }
      editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
    },
  },
  {
    title: 'Hero', description: 'Headline, subtext and a call to action', icon: <IconLayoutList size={16} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent({ type: 'heroBlock' }).run(),
  },
  {
    title: 'Call to action', description: 'A banner that pushes one action', icon: <IconClick size={16} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent({ type: 'ctaBlock' }).run(),
  },
  {
    title: 'Features', description: 'A short list of selling points', icon: <IconListDetails size={16} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent({ type: 'featuresBlock' }).run(),
  },
];

/** Slash-triggered block picker, à la Notion. Filters `ITEMS` by the text typed after "/". */
export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: CommandItem }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) =>
          ITEMS.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())).slice(0, 10),
        render: () => {
          let component: ReactRenderer<CommandListHandle, CommandListProps>;
          let popup: TippyInstance[];

          return {
            onStart: (props) => {
              component = new ReactRenderer(CommandList, { props, editor: props.editor });
              if (!props.clientRect) return;
              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                animation: 'shift-away',
                theme: 'light-border',
              });
            },
            onUpdate: (props) => {
              component.updateProps(props);
              if (!props.clientRect) return;
              popup[0].setProps({ getReferenceClientRect: props.clientRect as () => DOMRect });
            },
            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                popup[0].hide();
                return true;
              }
              return component.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              popup?.[0]?.destroy();
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});

interface CommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}
interface CommandListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const CommandList = forwardRef<CommandListHandle, CommandListProps>(({ items, command }, ref) => {
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowDown') {
        setSelected((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowUp') {
        setSelected((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === 'Enter') {
        if (items[selected]) command(items[selected]);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <Paper shadow="md" p="xs" radius="md" withBorder w={260}>
        <Text size="sm" c="dimmed">
          No matching blocks
        </Text>
      </Paper>
    );
  }

  return (
    <Paper shadow="md" p={4} radius="md" withBorder w={260} mah={320} style={{ overflowY: 'auto' }}>
      <Stack gap={2}>
        {items.map((item, index) => (
          <UnstyledButton
            key={item.title}
            onClick={() => command(item)}
            p={6}
            style={{
              borderRadius: 6,
              background: index === selected ? 'var(--mantine-color-gray-1)' : undefined,
            }}
          >
            <Group gap={8} wrap="nowrap">
              <ThemeIcon variant="light" color="gray" size="md">
                {item.icon}
              </ThemeIcon>
              <div>
                <Text size="sm" fw={500}>
                  {item.title}
                </Text>
                <Text size="xs" c="dimmed">
                  {item.description}
                </Text>
              </div>
            </Group>
          </UnstyledButton>
        ))}
      </Stack>
    </Paper>
  );
});
CommandList.displayName = 'CommandList';
