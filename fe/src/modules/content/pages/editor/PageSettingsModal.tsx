import {
  Button, Divider, Group, Modal, Stack, Switch, Text, TextInput, Textarea,
} from '@mantine/core';
import { ImageField } from '@/modules/content/components/ImageField';
import type { PageImage, PageSeo } from '@/types';

interface Props {
  opened: boolean;
  onClose: () => void;
  title: string;
  onTitleChange: (value: string) => void;
  slug: string;
  onSlugChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
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
  heroImage, onHeroImageChange,
  thumbnailImage, onThumbnailImageChange,
  seo, onSeoChange,
}: Props) {
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
