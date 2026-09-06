import { useRef, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Box,
  Drawer,
  Group,
  Stack,
  Text,
  Textarea,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { IconArrowUp, IconX } from '@tabler/icons-react';
import { api, ApiError } from '@/lib/api';
import { OrbitMark } from '@/modules/content/components/OrbitMark';
import classes from './AskAiDrawer.module.css';

/**
 * Starting points, so the empty box is not the only way in. Written as full
 * briefs rather than one-liners — "write a blog post" gets a thin answer, and
 * the topic is the part worth editing.
 */
const PRESETS = [
  'Write a full blog post about ',
  'Write a detailed case study about ',
  'Write a step-by-step guide to ',
  'Compare the main options for ',
];

interface Props {
  opened: boolean;
  onClose: () => void;
  /** The text the writer had selected, when there was one. */
  selection?: string;
  /** The document so far, so the model matches its voice. */
  context?: string;
  /** An HTML fragment, which the editor parses itself. */
  onInsert: (html: string) => void;
}

/**
 * Orbit AI, as a drawer beside the document.
 *
 * A drawer rather than a modal because the brief is written *about* the page —
 * a dialog centred over the document hides the thing being described, and the
 * writer ends up composing from memory. From the side, both are visible.
 *
 * Single-turn by design: this writes a section and hands it to the editor,
 * where it is edited like any other content. A conversation would put the
 * revising in the wrong place.
 */
export function AskAiDrawer({ opened, onClose, selection, context, onInsert }: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A preset is a lead-in the writer finishes, so the caret lands after it
  // rather than leaving them to click into the box and press End.
  const applyPreset = (preset: string) => {
    setPrompt(preset);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(preset.length, preset.length);
    });
  };

  const close = () => {
    setPrompt('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const { html } = await api.post<{ html: string }>('/ai/compose', {
        prompt,
        selection: selection || undefined,
        context: context || undefined,
      });
      onInsert(html);
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not generate content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={close}
      position="right"
      size={420}
      withCloseButton={false}
      padding={0}
      overlayProps={{ backgroundOpacity: 0.35, blur: 2 }}
      classNames={{ content: classes.drawer, body: classes.body }}
    >
      {/* The same drifting wash as the analytics app's assistant, so Orbit
          reads as one thing across both products rather than a panel bolted on.
          Sits behind everything; the rows above carry their own stacking so the
          text stays crisp. */}
      <div className={classes.aurora} aria-hidden />

      <Group justify="space-between" wrap="nowrap" px="md" py={12} className={classes.header}>
        <Group gap={8} wrap="nowrap">
          <OrbitMark size={22} />
          <Text size="sm" fw={600}>
            Orbit AI
          </Text>
        </Group>
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={close} aria-label="Close">
          <IconX size={15} />
        </ActionIcon>
      </Group>

      <Box className={classes.scroll}>
        <Stack gap="lg" p="md">
          {/* The empty state carries the explanation, so the composer below
              stays a box and a button. */}
          <Stack gap={6} align="center" py="lg">
            <OrbitMark size={44} />
            <Text fw={600} size="sm" mt={4}>
              Write with Orbit
            </Text>
            <Text size="xs" c="dimmed" ta="center" maw={280}>
              Describe the section you want. It arrives at your cursor as
              editable content, not a locked block.
            </Text>
          </Stack>

          {selection && (
            <Alert variant="light" color="blue" p="xs">
              <Text size="xs" lineClamp={2}>
                Replacing your selection: “{selection}”
              </Text>
            </Alert>
          )}

          <Stack gap={6}>
            <Text size="xs" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.04em' }}>
              Start with
            </Text>
            {PRESETS.map((p) => (
              <UnstyledButton
                key={p}
                className={classes.preset}
                onClick={() => applyPreset(p)}
              >
                <Text size="xs">{p.trim()}…</Text>
              </UnstyledButton>
            ))}
          </Stack>

          {error && (
            <Alert color="red" variant="light" p="xs">
              <Text size="xs">{error}</Text>
            </Alert>
          )}
        </Stack>
      </Box>

      {/* Pinned: the composer is the one control that must not scroll away. */}
      <Box className={classes.composer} p="sm">
        <Box className={classes.inputWrap}>
          <Textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.currentTarget.value)}
            placeholder="Describe what to write…"
            autosize
            minRows={2}
            maxRows={8}
            autoFocus
            variant="unstyled"
            disabled={loading}
            // Enter submits, Shift+Enter breaks the line: the box is a command,
            // not a document.
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            classNames={{ input: classes.input }}
          />

          <Group justify="space-between" align="center" px={10} pb={8}>
            <Text size="10px" c="dimmed">
              Enter to send
            </Text>
            <Tooltip label="Write" withArrow>
              <ActionIcon
                radius="xl"
                size="md"
                loading={loading}
                disabled={!prompt.trim()}
                onClick={submit}
                aria-label="Write"
              >
                <IconArrowUp size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Box>
      </Box>
    </Drawer>
  );
}
