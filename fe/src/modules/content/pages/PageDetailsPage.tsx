import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  CopyButton,
  Divider,
  Group,
  MultiSelect,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconEye,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconPencil,
} from '@tabler/icons-react';
import { usePageEditor } from '@/modules/content/pages/editor/usePageEditor';
import { ContentPreviewModal } from '@/modules/content/pages/editor/preview/ContentPreviewModal';
import { ImageField } from '@/modules/content/components/ImageField';
import { workspaceService } from '@/modules/workspace/workspaceService';
import { pageService } from '@/modules/content/pageService';
import type { PageStatus, Term } from '@/types';
import { FormSkeleton, HeaderSkeleton } from '@/components/Skeletons';

const STATUS_COLOR: Record<PageStatus, string> = {
  draft: 'gray',
  published: 'teal',
  archived: 'orange',
};

/**
 * Page metadata on its own screen — title, slug, description, taxonomy, media
 * and SEO. The body is edited in the editor; this route holds the fields that
 * describe the page rather than fill it.
 *
 * Two columns rather than one long card: the fields a writer edits most sit in
 * the wide column, while status, taxonomy and artwork — set once and rarely
 * revisited — sit in a rail beside them. A single stack gave a slug the same
 * visual weight as a hero image, so nothing read as more important than
 * anything else.
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
      <Stack gap="lg">
        <HeaderSkeleton />
        <FormSkeleton />
      </Stack>
    );
  }

  const backToPages = () => navigate(`/${editor.workspace?.slug}/content/pages`);
  const publicUrl = editor.workspace
    ? pageService.publicUrl(editor.workspace.id, editor.slug)
    : '';

  return (
    <Stack gap="lg">
  
      <Box className="page-details-header">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              aria-label="Back to pages"
              onClick={backToPages}
            >
              <IconArrowLeft size={18} />
            </ActionIcon>
            <div style={{ minWidth: 0 }}>
              <Group gap="xs" wrap="nowrap">
                <Title order={3} lineClamp={1}>
                  {editor.title || 'Untitled'}
                </Title>
                <Badge size="sm" variant="light" color={STATUS_COLOR[editor.status]}>
                  {editor.status}
                </Badge>
              </Group>
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
            <Button
              variant="default"
              leftSection={<IconPencil size={15} />}
              onClick={() =>
                navigate(`/${editor.workspace?.slug}/content/pages/${id}/edit`)
              }
            >
              Open editor
            </Button>
            <Button
              loading={editor.saving}
              onClick={() =>
                editor.save(editor.status === 'published' ? 'published' : 'draft')
              }
            >
              Save
            </Button>
          </Group>
        </Group>
      </Box>

      {editor.error && (
        <Alert color="red" variant="light">
          {editor.error}
        </Alert>
      )}

      <Box
        style={{
          display: 'grid',
          gap: 'var(--mantine-spacing-md)',
          gridTemplateColumns: 'minmax(0, 1fr) 22rem',
          alignItems: 'start',
        }}
        className="page-details-grid"
      >
        {/* ------------------------------------------------ main column -- */}
        <Stack gap="md">
          <Section title="Content" description="What the page is called and says.">
            <TextInput
              label="Title"
              withAsterisk
              size="md"
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
              rightSection={
                editor.slug && (
                  <CopyButton value={publicUrl}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copied' : 'Copy API URL'} withArrow>
                        <ActionIcon variant="subtle" color="gray" onClick={copy}>
                          {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                )
              }
              value={editor.slug}
              onChange={(e) => editor.setSlug(e.currentTarget.value)}
            />

            {/* Sits under the slug because it is that slug's URL — as its own
                card in the rail it read as an unrelated stray. */}
            {editor.status === 'published' && publicUrl && (
              <Anchor
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                mt={-6}
              >
                <Group gap={4} wrap="nowrap">
                  <IconExternalLink size={13} />
                  View live API response
                </Group>
              </Anchor>
            )}

            <Textarea
              label="Description"
              description="A short summary shown in listings and to API consumers"
              autosize
              minRows={3}
              maxLength={500}
              value={editor.description}
              onChange={(e) => editor.setDescription(e.currentTarget.value)}
            />
            {/* Counted because the field is capped and a truncated summary is
                not obvious until it is already saved. */}
            <Text size="xs" c="dimmed" ta="right" mt={-8}>
              {editor.description.length}/500
            </Text>
          </Section>

          <Section
            title="Search engines"
            description="Overrides the title and description above when this page is listed in search results."
          >
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
              onChange={(e) =>
                editor.setSeo({ ...editor.seo, description: e.currentTarget.value })
              }
            />

            <Divider my={4} />

            <Switch
              label="Hide from search engines"
              description="Adds noindex, so this page is not listed in results."
              checked={editor.seo.noIndex}
              onChange={(e) =>
                editor.setSeo({ ...editor.seo, noIndex: e.currentTarget.checked })
              }
            />
          </Section>
        </Stack>

        {/* ------------------------------------------------------- rail -- */}
        <Stack gap="md">
          <Section title="Organisation">
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
          </Section>

          <Section title="Media" description="Artwork used in listings and social previews.">
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
          </Section>

        </Stack>
      </Box>

      {editor.workspace && id && (
        <ContentPreviewModal
          opened={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={editor.title}
          content={editor.content}
          src={pageService.previewUrl(editor.workspace.id, editor.slug)}
        />
      )}
    </Stack>
  );
}

/** A titled group of fields, so the form reads as sections rather than a list. */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <div>
          <Text fw={600} size="sm">
            {title}
          </Text>
          {description && (
            <Text size="xs" c="dimmed" mt={2}>
              {description}
            </Text>
          )}
        </div>
        {children}
      </Stack>
    </Card>
  );
}
