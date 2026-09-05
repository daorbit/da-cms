import { useRef, useState } from 'react';
import { Modal, Textarea, Button, Group, Stack, Text, Alert, Chip } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { api, ApiError } from '@/lib/api';

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

export function AskAiModal({ opened, onClose, selection, context, onInsert }: Props) {
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
    <Modal
      opened={opened}
      onClose={close}
      title={
        <Group gap="xs">
          <IconSparkles size={18} />
          <Text fw={600}>Ask AI</Text>
        </Group>
      }
      size="lg"
    >
      <Stack gap="md">
        {selection && (
          <Alert variant="light" color="blue">
            <Text size="sm" lineClamp={2}>
              Working from your selection: “{selection}”
            </Text>
          </Alert>
        )}

        <Textarea
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.currentTarget.value)}
          placeholder="Describe what to write…"
          autosize
          minRows={3}
          maxRows={8}
          autoFocus
          // Enter submits, Shift+Enter breaks the line: the box is a command,
          // not a document.
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
        />

        <Group gap="xs">
          {PRESETS.map((p) => (
            <Chip key={p} checked={false} size="xs" onClick={() => applyPreset(p)}>
              {p}
            </Chip>
          ))}
        </Group>

        {error && (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        )}

        <Group justify="flex-end">
          <Button variant="subtle" onClick={close} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            loading={loading}
            disabled={!prompt.trim()}
            leftSection={<IconSparkles size={16} />}
          >
            Write
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
