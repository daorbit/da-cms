import { useEffect, useState } from 'react';
import {
  Alert, Button, Group, Modal, Select, Stack, Text, TextInput, Textarea,
} from '@mantine/core';
import { useWorkspace } from '@/hooks/useWorkspace';
import { pageService } from '@/modules/content/pageService';
import { workspaceService } from '@/modules/workspace/workspaceService';
import { ApiError } from '@/lib/api';
import type { Page } from '@/types';

const slugify = (input: string) =>
  input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

interface Props {
  opened: boolean;
  onClose: () => void;
  /** Called with the created page — the caller routes into the editor. */
  onCreated: (page: Page) => void;
}

/**
 * Basic details only: title, slug, description, group.
 *
 * Media and SEO are edited later from the page editor / settings, not here — the
 * create step just needs enough to open the page ready to write in.
 */
export function CreatePageModal({ opened, onClose, onCreated }: Props) {
  const workspace = useWorkspace();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  // Until the slug is hand-edited it follows the title; after, it is left alone.
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [group, setGroup] = useState<string | null>(null);

  const [groups, setGroups] = useState<string[]>([]);

  const titleError = title.trim() ? null : 'A title is required';

  useEffect(() => {
    if (!workspace || !opened) return;
    workspaceService
      .settings(workspace.id)
      .then((s) => setGroups(s.configuration.groups.map((g) => g.name)))
      .catch(() => {});
  }, [workspace, opened]);

  const reset = () => {
    setError(null);
    setTitle('');
    setSlug('');
    setSlugTouched(false);
    setTitleTouched(false);
    setDescription('');
    setGroup(null);
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

  const create = async () => {
    setTitleTouched(true);
    if (!workspace || titleError) return;

    setBusy(true);
    setError(null);
    try {
      const page = await pageService.create(workspace.id, {
        title: title.trim(),
        slug: slug || slugify(title),
        description,
        ...(group ? { group } : {}),
        content: '',
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
      <Stack gap="sm">
        {error && (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        )}

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
        <Select
          label="Group"
          description="From workspace settings"
          placeholder="Pick a group"
          data={groups}
          value={group}
          onChange={setGroup}
          searchable
          clearable
        />

        <Group justify="space-between" mt="sm">
          <Button variant="subtle" color="gray" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button loading={busy} onClick={create}>
            Create page
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
