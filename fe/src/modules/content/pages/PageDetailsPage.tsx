import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ActionIcon, Alert, Button, Card, Center, Divider, Group, Loader, MultiSelect, Select,
  Stack, Switch, Text, TextInput, Textarea, Title, Tooltip,
} from '@mantine/core';
import { IconArrowLeft, IconEye } from '@tabler/icons-react';
import { usePageEditor } from '@/modules/content/pages/editor/usePageEditor';
import { ContentPreviewModal } from '@/modules/content/pages/editor/preview/ContentPreviewModal';
import { ImageField } from '@/modules/content/components/ImageField';
import { workspaceService } from '@/modules/workspace/workspaceService';
import { pageService } from '@/modules/content/pageService';
import type { Term } from '@/types';

/**
 * Page metadata on its own screen — title, slug, description, taxonomy, media
 * and SEO. The content body is edited separately in the editor; this route is
 * for the fields that describe the page rather than fill it.
 */
export function PageDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editor = usePageEditor(id);

  const [groups, setGroups] = useState<Term[]>([]);
  const [tagOptions, setTagOptions] = useState<Term[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!editor.workspace) return;
    workspaceService
      .settings(editor.workspace.id)
      .then((s) => {
        setGroups(s.configuration.groups);
        setTagOptions(s.configuration.tags);
      })
      .catch(() => {});
  }, [editor.workspace]);

  if (editor.loading) {
    return (
      <Center py={80}>
        <Loader size="sm" />
      </Center>
    );
  }

  const backToPages = () => navigate(`/${editor.workspace?.slug}/content/pages`);

  return (
    <Stack gap="lg">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Back to pages" onClick={backToPages}>
            <IconArrowLeft size={18} />
          </ActionIcon>
          <div style={{ minWidth: 0 }}>
            <Title order={3}>
              {editor.title || 'Untitled'}
            </Title>
            <Text size="xs" c="dimmed">
              Page details
            </Text>
          </div>
        </Group>

        <Group gap="xs" wrap="nowrap">
          <Tooltip label="Preview content" withArrow>
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Preview content"
              onClick={() => setPreviewOpen(true)}
            >
              <IconEye size={17} />
            </ActionIcon>
          </Tooltip>
          <Button variant="default" onClick={() => navigate(`/${editor.workspace?.slug}/content/pages/${id}/edit`)}>
            Open editor
          </Button>
          <Button
            loading={editor.saving}
            onClick={() => editor.save(editor.status === 'published' ? 'published' : 'draft')}
          >
            Save
          </Button>
        </Group>
      </Group>

      {editor.error && (
        <Alert color="red" variant="light">
          {editor.error}
        </Alert>
      )}

      <Card withBorder radius="md">
        <Stack gap="sm">
          <TextInput
            label="Title"
            withAsterisk
            value={editor.title}
            onChange={(e) => editor.setTitle(e.currentTarget.value)}
          />
          <TextInput
            label="Slug"
            description="The path this page is served at"
            leftSection={
              <Text size="sm" c="dimmed">
                /
              </Text>
            }
            value={editor.slug}
            onChange={(e) => editor.setSlug(e.currentTarget.value)}
          />
          <Textarea
            label="Description"
            description="A short summary shown in listings and to API consumers"
            autosize
            minRows={2}
            maxLength={500}
            value={editor.description}
            onChange={(e) => editor.setDescription(e.currentTarget.value)}
          />

          <Divider label="Organisation" labelPosition="left" mt="xs" />

          <Group grow align="flex-start">
            <Select
              label="Group"
              description="Managed in workspace settings"
              placeholder={groups.length ? 'No group' : 'Add groups in Settings'}
              data={groups.map((g) => ({ value: g.name, label: g.name }))}
              value={editor.group || null}
              clearable
              disabled={groups.length === 0}
              onChange={(v) => editor.setGroup(v ?? '')}
            />
            <MultiSelect
              label="Tags"
              placeholder={tagOptions.length ? 'Pick tags' : 'No tags defined yet'}
              data={tagOptions.map((t) => ({ value: t.name, label: t.name }))}
              value={editor.tags}
              onChange={editor.setTags}
              searchable
              disabled={tagOptions.length === 0}
            />
          </Group>

          <Divider label="Media" labelPosition="left" mt="xs" />

          <Group grow align="flex-start" gap="md">
            <ImageField
              label="Hero image"
              value={editor.heroImage}
              onChange={editor.setHeroImage}
              ratio={16 / 9}
            />
            <ImageField
              label="Thumbnail"
              value={editor.thumbnailImage}
              onChange={editor.setThumbnailImage}
              ratio={4 / 3}
            />
          </Group>

          <Divider label="Search engines" labelPosition="left" mt="xs" />

          <TextInput
            label="Meta title"
            placeholder={editor.title || 'Page title'}
            value={editor.seo.title}
            onChange={(e) => editor.setSeo({ ...editor.seo, title: e.currentTarget.value })}
          />
          <Textarea
            label="Meta description"
            placeholder={editor.description || 'A short summary for search results.'}
            autosize
            minRows={2}
            value={editor.seo.description}
            onChange={(e) => editor.setSeo({ ...editor.seo, description: e.currentTarget.value })}
          />
          <Switch
            label="Hide from search engines"
            checked={editor.seo.noIndex}
            onChange={(e) => editor.setSeo({ ...editor.seo, noIndex: e.currentTarget.checked })}
          />
        </Stack>
      </Card>

      {editor.workspace && id && (
        <ContentPreviewModal
          opened={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={editor.title}
          src={pageService.previewUrl(editor.workspace.id, editor.slug)}
        />
      )}
    </Stack>
  );
}
