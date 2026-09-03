import { useState } from 'react';
import {
  Alert, Button, Divider, Group, Modal, Stack, Stepper, Switch, Text, TextInput, Textarea,
} from '@mantine/core';
import { useWorkspace } from '@/hooks/useWorkspace';
import { pageService } from '@/modules/content/pageService';
import { ImageField } from '@/modules/content/components/ImageField';
import { ApiError } from '@/lib/api';
import type { Page, PageImage, PageSeo } from '@/types';

const slugify = (input: string) =>
  input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const EMPTY_IMAGE: PageImage = { url: '', alt: '' };
const EMPTY_SEO: PageSeo = { title: '', description: '', ogImage: '', noIndex: false };

interface Props {
  opened: boolean;
  onClose: () => void;
  /** Called with the created page — the caller routes into the editor. */
  onCreated: (page: Page) => void;
}

/**
 * Everything about a page except its content.
 *
 * Collected here rather than in the editor so the editor itself can be just the
 * writing surface: the details are answered once, up front, and the page opens
 * ready to write in.
 */
export function CreatePageModal({ opened, onClose, onCreated }: Props) {
  const workspace = useWorkspace();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  // Until the slug is hand-edited it follows the title; after, it is left alone.
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);

  const [heroImage, setHeroImage] = useState<PageImage>(EMPTY_IMAGE);
  const [thumbnailImage, setThumbnailImage] = useState<PageImage>(EMPTY_IMAGE);
  const [seo, setSeo] = useState<PageSeo>(EMPTY_SEO);

  const titleError = title.trim() ? null : 'A title is required';

  const reset = () => {
    setStep(0);
    setError(null);
    setTitle('');
    setSlug('');
    setSlugTouched(false);
    setTitleTouched(false);
    setDescription('');
    setHeroImage(EMPTY_IMAGE);
    setThumbnailImage(EMPTY_IMAGE);
    setSeo(EMPTY_SEO);
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const next = () => {
    setTitleTouched(true);
    if (titleError) return;
    setError(null);
    setStep(1);
  };

  const create = async () => {
    if (!workspace || titleError) return;

    setBusy(true);
    setError(null);
    try {
      const page = await pageService.create(workspace.id, {
        title: title.trim(),
        slug: slug || slugify(title),
        description,
        heroImage,
        thumbnailImage,
        seo,
        body: '',
        status: 'draft',
      });
      reset();
      onCreated(page);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the page');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title="New page" size="lg" centered>
      <Stack gap="lg">
        <Stepper active={step} onStepClick={setStep} size="sm" allowNextStepsSelect={false}>
          <Stepper.Step label="Details" description="Title and slug" />
          <Stepper.Step label="Media & SEO" description="Optional" />
        </Stepper>

        {error && (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        )}

        {step === 0 && (
          <Stack gap="sm">
            <TextInput
              label="Title"
              placeholder="About us"
              size="md"
              withAsterisk
              data-autofocus
              value={title}
              error={titleTouched ? titleError : null}
              onChange={(e) => onTitleChange(e.currentTarget.value)}
              onBlur={() => setTitleTouched(true)}
            />
            <TextInput
              label="Slug"
              description="The path this page is served at"
              leftSection={
                <Text size="sm" c="dimmed">
                  /
                </Text>
              }
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.currentTarget.value);
              }}
            />
            <Textarea
              label="Description"
              description="A short summary shown in listings"
              placeholder="What this page is about."
              autosize
              minRows={2}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
            />
          </Stack>
        )}

        {step === 1 && (
          <Stack gap="md">
            <Group grow align="flex-start" gap="md">
              <ImageField
                label="Hero image"
                value={heroImage}
                onChange={setHeroImage}
                ratio={16 / 9}
              />
              <ImageField
                label="Thumbnail"
                value={thumbnailImage}
                onChange={setThumbnailImage}
                ratio={4 / 3}
              />
            </Group>

            <Divider label="Search engines" labelPosition="left" />

            <TextInput
              label="Meta title"
              description="Falls back to the page title when empty"
              placeholder={title || 'Page title'}
              value={seo.title}
              onChange={(e) => setSeo((s) => ({ ...s, title: e.currentTarget.value }))}
            />
            <Textarea
              label="Meta description"
              placeholder={description || 'A short summary for search results.'}
              autosize
              minRows={2}
              value={seo.description}
              onChange={(e) => setSeo((s) => ({ ...s, description: e.currentTarget.value }))}
            />
            <Switch
              label="Hide from search engines"
              description="Adds a noindex tag to this page"
              checked={seo.noIndex}
              onChange={(e) => setSeo((s) => ({ ...s, noIndex: e.currentTarget.checked }))}
            />
          </Stack>
        )}

        <Group justify="space-between">
          <Button variant="subtle" color="gray" onClick={close} disabled={busy}>
            Cancel
          </Button>

          <Group gap="xs">
            {step === 1 && (
              <Button variant="default" onClick={() => setStep(0)} disabled={busy}>
                Back
              </Button>
            )}
            {step === 0 ? (
              <Button onClick={next}>Continue</Button>
            ) : (
              <Button loading={busy} onClick={create}>
                Create page
              </Button>
            )}
          </Group>
        </Group>

        {/* Step two is entirely optional, so it must be possible to leave it
            without filling anything in. */}
        {step === 0 && (
          <Text size="xs" c="dimmed" ta="center">
            You can add images and SEO next, or skip them and start writing.
          </Text>
        )}
      </Stack>
    </Modal>
  );
}
