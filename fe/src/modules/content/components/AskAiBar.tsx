import { useEffect, useRef, useState } from 'react';
import {
  ActionIcon,
  Box,
  CloseButton,
  Group,
  Image,
  Text,
  Textarea,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconArrowUp,
  IconMicrophone,
  IconPhoto,
  IconPlayerStopFilled,
  IconSparkles,
  IconX,
} from '@tabler/icons-react';
import { api, ApiError } from '@/lib/api';
import { useSpeechInput } from '@/hooks/useSpeechInput';
import { OrbitMark } from '@/modules/content/components/OrbitMark';
import { AiSuggestionsModal } from './AiSuggestionsModal';
import classes from './AskAiBar.module.css';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

interface Props {
  opened: boolean;
  onClose: () => void;
  selection?: string;
  context?: string;
  onInsert: (html: string, mode?: 'insert' | 'replace') => void;
  onGeneratingChange: (generating: boolean) => void;
}

 
export function AskAiBar({
  opened,
  onClose,
  selection,
  context,
  onInsert,
  onGeneratingChange,
}: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<{ id: string; dataUrl: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const applyPrompt = (value: string) => {
    setPrompt(value);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(value.length, value.length);
    });
  };

 
  const speech = useSpeechInput({
    onTranscript: (text, final) => {
      if (final) setPrompt((p) => (p ? `${p} ${text}` : text));
    },
  });

  useEffect(() => {
    if (opened) requestAnimationFrame(() => inputRef.current?.focus());
  }, [opened]);

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);

    for (const file of Array.from(files)) {
      if (file.size > MAX_IMAGE_BYTES) {
        setError(`${file.name} is larger than 4MB`);
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read that image'));
        reader.readAsDataURL(file);
      }).catch(() => '');

      if (dataUrl) {
        setImages((prev) => [...prev, { id: crypto.randomUUID(), dataUrl }]);
      }
    }
  };

  const close = () => {
    setPrompt('');
    setImages([]);
    setError(null);
    speech.stop();
    onClose();
  };

  const submit = async () => {
    if (!prompt.trim() || loading) return;

    speech.stop();
    setLoading(true);
    setError(null);
    onGeneratingChange(true);

    try {
      const { html, mode } = await api.post<{ html: string; mode?: 'insert' | 'replace' }>(
        '/ai/compose',
        {
          prompt,
          selection: selection || undefined,
          context: context || undefined,
          images: images.length ? images.map((i) => i.dataUrl) : undefined,
        }
      );
      onInsert(html, mode ?? 'insert');
      setPrompt('');
      setImages([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not generate content');
    } finally {
      setLoading(false);
      onGeneratingChange(false);
    }
  };

  if (!opened) return null;

  return (
    <Box className={classes.bar}>

      <div className={classes.aurora} aria-hidden />

      <Box className={classes.inner}>
        <Group justify="space-between" mb={8} wrap="nowrap">
          <Group gap={7} wrap="nowrap">
            <OrbitMark size={18} />
            <Text size="xs" fw={600}>
              Orbit AI
            </Text>
            {loading && (
              <Text size="xs" c="dimmed">
                writing…
              </Text>
            )}
          </Group>
          <Tooltip label="Close" withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={close}
              aria-label="Close Orbit"
            >
              <IconX size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {error && (
          <Text size="xs" c="red" mb={6}>
            {error}
          </Text>
        )}

        {selection && (
          <Text size="xs" c="dimmed" mb={6} lineClamp={1}>
            Replacing your selection: “{selection}”
          </Text>
        )}

        {images.length > 0 && (
          <Group gap={6} mb={8}>
            {images.map((img) => (
              <Box key={img.id} className={classes.thumb}>
                <Image src={img.dataUrl} alt="" h={44} w={44} fit="cover" radius="sm" />
                <CloseButton
                  size={16}
                  className={classes.thumbRemove}
                  aria-label="Remove image"
                  onClick={() => setImages((p) => p.filter((i) => i.id !== img.id))}
                />
              </Box>
            ))}
          </Group>
        )}

        <Box className={classes.inputWrap} data-listening={speech.listening || undefined}>
          <Group gap={8} align="flex-end" wrap="nowrap">
            <Textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.currentTarget.value)}
              placeholder={
                speech.listening ? 'Listening…' : 'Ask Orbit to write something…'
              }
              autosize
              minRows={3}
              maxRows={10}
              variant="unstyled"
              disabled={loading}
              style={{ flex: 1 }}
              classNames={{ input: classes.input }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
                if (e.key === 'Escape') close();
              }}
            />

            <Group gap={2} pr={6} pb={5} wrap="nowrap">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  void addImages(e.currentTarget.files);
                  e.currentTarget.value = '';
                }}
              />

              <Tooltip label="Add an image for reference" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  disabled={loading}
                  onClick={() => fileRef.current?.click()}
                  aria-label="Add image"
                >
                  <IconPhoto size={17} />
                </ActionIcon>
              </Tooltip>

              {speech.supported && (
                <Tooltip label={speech.listening ? 'Stop dictating' : 'Dictate'} withArrow>
                  <ActionIcon
                    variant={speech.listening ? 'filled' : 'subtle'}
                    color={speech.listening ? 'red' : 'gray'}
                    disabled={loading}
                    onClick={speech.toggle}
                    aria-label={speech.listening ? 'Stop dictating' : 'Dictate'}
                  >
                    {speech.listening ? (
                      <IconPlayerStopFilled size={13} />
                    ) : (
                      <IconMicrophone size={17} />
                    )}
                  </ActionIcon>
                </Tooltip>
              )}

              <ActionIcon
                radius="xl"
                size="md"
                color="#059669"
                loading={loading}
                disabled={!prompt.trim()}
                onClick={submit}
                aria-label="Send"
              >
                <IconArrowUp size={16} />
              </ActionIcon>
            </Group>
          </Group>
        </Box>

        <Group justify="space-between" mt={7} wrap="nowrap">
          <Text size="10px" c={speech.error ? 'red' : 'dimmed'}>
            {loading
              ? 'Writing into your document — saving is paused until it finishes.'
              : speech.error || 'Enter to send · Shift+Enter for a new line'}
          </Text>

   
          <UnstyledButton
            className={classes.suggestLink}
            disabled={loading}
            onClick={() => setSuggestionsOpen(true)}
          >
            <Group gap={4} wrap="nowrap">
              <IconSparkles size={12} />
              <Text size="10px" fw={500}>
                Browse prompts
              </Text>
            </Group>
          </UnstyledButton>
        </Group>
      </Box>

      <AiSuggestionsModal
        opened={suggestionsOpen}
        onClose={() => setSuggestionsOpen(false)}
        hasSelection={!!selection}
        onPick={applyPrompt}
      />
    </Box>
  );
}
