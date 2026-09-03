import { useEffect, useState } from 'react';
import {
  Button, Divider, Group, Modal, MultiSelect, Select, Stack, Switch, Text, TextInput, Textarea,
} from '@mantine/core';
import { ImageField } from '@/modules/content/components/ImageField';
import { useWorkspace } from '@/hooks/useWorkspace';
import { workspaceService } from '@/modules/workspace/workspaceService';
import type { PageImage, PageSeo, Term } from '@/types';

interface Props {
  opened: boolean;
  onClose: () => void;
  title: string;
  onTitleChange: (value: string) => void;
  slug: string;
  onSlugChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  group: string;
  onGroupChange: (value: string) => void;
  tags: string[];
  onTagsChange: (value: string[]) => void;
  heroImage: PageImage;
  onHeroImageChange: (value: PageImage) => void;
  thumbnailImage: PageImage;
  onThumbnailImageChange: (value: PageImage) => void;
  seo: PageSeo;
  onSeoChange: (value: PageSeo) => void;
}

export function PageSettingsModal({
  opened, onClose,
  title, onTitleChange,
  slug, onSlugChange,
  description, onDescriptionChange,
  group, onGroupChange,
  tags, onTagsChange,
  heroImage, onHeroImageChange,
  thumbnailImage, onThumbnailImageChange,
  seo, onSeoChange,
}: Props) {
  const workspace = useWorkspace();
  const [groups, setGroups] = useState<Term[]>([]);
  const [tagOptions, setTagOptions] = useState<Term[]>([]);

  // Load the workspace taxonomy once the modal is first opened.
  useEffect(() => {
    if (!opened || !workspace) return;
    workspaceService
      .settings(workspace.id)
      .then((s) => {
        setGroups(s.pageGroups);
        setTagOptions(s.pageTags);
      })
      .catch(() => {});
  }, [opened, workspace]);

  return (
    <Modal opened={opened} onClose={onClose} title="Page settings" size="lg" centered>
      <Stack gap="sm">
        <TextInput
          label="Title"
          withAsterisk
          value={title}
          onChange={(e) => onTitleChange(e.currentTarget.value)}
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
          onChange={(e) => onSlugChange(e.currentTarget.value)}
        />
        <Textarea
          label="Description"
          autosize
          minRows={2}
          maxLength={500}
          value={description}
          onChange={(e) => onDescriptionChange(e.currentTarget.value)}
        />

        <Divider label="Organisation" labelPosition="left" mt="xs" />

        <Group grow align="flex-start">
          <Select
            label="Group"
            description="Managed in workspace settings"
            data={groups.map((g) => ({ value: g.slug, label: g.name }))}
            value={group}
            allowDeselect={false}
            onChange={(v) => v && onGroupChange(v)}
          />
          <MultiSelect
            label="Tags"
            placeholder={tagOptions.length ? 'Pick tags' : 'No tags defined yet'}
            data={tagOptions.map((t) => ({ value: t.slug, label: t.name }))}
            value={tags}
            onChange={onTagsChange}
            searchable
            disabled={tagOptions.length === 0}
          />
        </Group>

        <Divider label="Media" labelPosition="left" mt="xs" />

        <Group grow align="flex-start" gap="md">
          <ImageField label="Hero image" value={heroImage} onChange={onHeroImageChange} ratio={16 / 9} />
          <ImageField
            label="Thumbnail"
            value={thumbnailImage}
            onChange={onThumbnailImageChange}
            ratio={4 / 3}
          />
        </Group>

        <Divider label="Search engines" labelPosition="left" mt="xs" />

        <TextInput
          label="Meta title"
          placeholder={title || 'Page title'}
          value={seo.title}
          onChange={(e) => onSeoChange({ ...seo, title: e.currentTarget.value })}
        />
        <Textarea
          label="Meta description"
          placeholder={description || 'A short summary for search results.'}
          autosize
          minRows={2}
          value={seo.description}
          onChange={(e) => onSeoChange({ ...seo, description: e.currentTarget.value })}
        />
        <Switch
          label="Hide from search engines"
          checked={seo.noIndex}
          onChange={(e) => onSeoChange({ ...seo, noIndex: e.currentTarget.checked })}
        />

        <Group justify="flex-end" mt="md">
          {/* Changes here live in the same state as the editor, so this only
              closes — the page is written by the toolbar's Save. */}
          <Button onClick={onClose}>Done</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
