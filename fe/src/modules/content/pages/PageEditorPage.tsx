import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Badge, Button, Card, Center, Divider, Grid, Group, Loader, Menu, Select, Stack,
  Switch, Tabs, Text, TextInput, Textarea, Title, Breadcrumbs, Anchor,
} from '@mantine/core';
import {
  IconPlus, IconArrowLeft, IconDeviceFloppy, IconFileText, IconStack2, IconSeo,
} from '@tabler/icons-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { pageService } from '@/modules/content/pageService';
import { RichTextField } from '@/modules/content/components/RichTextField';
import { ImageField } from '@/modules/content/components/ImageField';
import { SectionInspector } from '@/modules/content/sections/SectionInspector';
import { SECTION_LIST, createSection } from '@/modules/content/sections/registry';
import { ApiError } from '@/lib/api';
import type {
  PageSection, PageSeo, PageImage, PageStatus, SectionType, Author,
} from '@/types';

const slugify = (input: string) =>
  input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const EMPTY_IMAGE: PageImage = { url: '', alt: '' };
const EMPTY_SEO: PageSeo = { title: '', description: '', ogImage: '', noIndex: false };

const STATUS_COLOR: Record<PageStatus, string> = {
  draft: 'gray',
  published: 'teal',
  archived: 'orange',
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/** One row of the metadata panel — a dash rather than a blank when unset. */
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" gap="xl" wrap="nowrap">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="xs" fw={500} ta="right">
        {value}
      </Text>
    </Group>
  );
}

export function PageEditorPage() {
  const { id } = useParams();
  const workspace = useWorkspace();
  const navigate = useNavigate();
  const isNew = id === undefined;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  // Tracks whether the slug has been hand-edited. Until it has, it follows the
  // title; after, it is left alone so a title tweak cannot change a live URL.
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [heroImage, setHeroImage] = useState<PageImage>(EMPTY_IMAGE);
  const [thumbnailImage, setThumbnailImage] = useState<PageImage>(EMPTY_IMAGE);
  const [body, setBody] = useState('');
  const [sections, setSections] = useState<PageSection[]>([]);
  const [seo, setSeo] = useState<PageSeo>(EMPTY_SEO);
  const [status, setStatus] = useState<PageStatus>('draft');

  const [audit, setAudit] = useState<{
    createdAt?: string;
    updatedAt?: string;
    publishedAt: string | null;
    createdBy: Author | null;
    updatedBy: Author | null;
  } | null>(null);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew || !workspace || !id) return;
    let cancelled = false;

    (async () => {
      try {
        const page = await pageService.get(workspace.id, id);
        if (cancelled) return;
        setTitle(page.title);
        setSlug(page.slug);
        setSlugTouched(true);
        setDescription(page.description ?? '');
        setHeroImage(page.heroImage ?? EMPTY_IMAGE);
        setThumbnailImage(page.thumbnailImage ?? EMPTY_IMAGE);
        setBody(page.body ?? '');
        setSections(page.sections ?? []);
        setSeo(page.seo ?? EMPTY_SEO);
        setStatus(page.status);
        setAudit({
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
          publishedAt: page.publishedAt,
          createdBy: page.createdBy,
          updatedBy: page.updatedBy,
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load the page');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isNew, workspace, id]);

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const addSection = (type: SectionType) => setSections((s) => [...s, createSection(type)]);

  const updateSection = (index: number, data: Record<string, unknown>) =>
    setSections((s) => s.map((section, i) => (i === index ? { ...section, data } : section)));

  const moveSection = (index: number, direction: -1 | 1) =>
    setSections((s) => {
      const next = [...s];
      const target = index + direction;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const removeSection = (index: number) => setSections((s) => s.filter((_, i) => i !== index));

  const save = async (nextStatus: PageStatus) => {
    if (!workspace) return;
    if (!title.trim()) {
      setError('A title is required');
      return;
    }

    setSaving(true);
    setError(null);
    const payload = {
      title: title.trim(),
      slug: slug || slugify(title),
      description,
      heroImage,
      thumbnailImage,
      body,
      sections,
      seo,
      status: nextStatus,
    };

    try {
      const saved = isNew
        ? await pageService.create(workspace.id, payload)
        : await pageService.update(workspace.id, id!, payload);

      setStatus(saved.status);
      setAudit({
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
        publishedAt: saved.publishedAt,
        createdBy: saved.createdBy,
        updatedBy: saved.updatedBy,
      });

      if (isNew) {
        navigate(`/${workspace.slug}/content/pages/${saved.id}/edit`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the page');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Center py={80}>
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Breadcrumbs separator="/">
        <Anchor size="sm" c="dimmed" onClick={() => navigate(`/${workspace?.slug}/content/pages`)}>
          Pages
        </Anchor>
        <Text size="sm">{isNew ? 'New page' : title || 'Untitled'}</Text>
      </Breadcrumbs>

      <Group justify="space-between" align="flex-start">
        <Group gap="sm">
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate(`/${workspace?.slug}/content/pages`)}
          >
            Back
          </Button>
          <Badge variant="light" color={STATUS_COLOR[status]}>
            {status}
          </Badge>
        </Group>

        <Group gap="sm">
          <Button
            variant="default"
            loading={saving}
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={() => save(status === 'published' ? 'published' : 'draft')}
          >
            Save
          </Button>
          {status === 'published' ? (
            <Button variant="light" color="orange" loading={saving} onClick={() => save('draft')}>
              Unpublish
            </Button>
          ) : (
            <Button loading={saving} onClick={() => save('published')}>
              Publish
            </Button>
          )}
        </Group>
      </Group>

      {error && (
        <Alert color="red" variant="light">
          {error}
        </Alert>
      )}

      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Tabs defaultValue="content">
            <Tabs.List mb="md">
              <Tabs.Tab value="content" leftSection={<IconFileText size={15} />}>
                Content
              </Tabs.Tab>
              <Tabs.Tab value="sections" leftSection={<IconStack2 size={15} />}>
                Sections
                {sections.length > 0 && (
                  <Badge size="xs" variant="light" color="gray" ml={6}>
                    {sections.length}
                  </Badge>
                )}
              </Tabs.Tab>
              <Tabs.Tab value="seo" leftSection={<IconSeo size={15} />}>
                SEO
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="content">
              <Stack gap="md">
                <Card withBorder radius="md" p="md">
                  <Stack gap="sm">
                    <TextInput
                      label="Title"
                      placeholder="About us"
                      size="md"
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
                </Card>

                <Card withBorder radius="md" p="md">
                  <RichTextField
                    label="Body"
                    description="The main content of the page"
                    value={body}
                    onChange={setBody}
                    placeholder="Start writing…"
                  />
                </Card>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="sections">
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <Text c="dimmed" size="sm">
                    Blocks render in this order on the published page.
                  </Text>
                  <Menu shadow="md" width={240} position="bottom-end">
                    <Menu.Target>
                      <Button size="xs" variant="light" leftSection={<IconPlus size={14} />}>
                        Add section
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {SECTION_LIST.map((definition) => (
                        <Menu.Item key={definition.type} onClick={() => addSection(definition.type)}>
                          <Text size="sm" fw={500}>
                            {definition.label}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {definition.description}
                          </Text>
                        </Menu.Item>
                      ))}
                    </Menu.Dropdown>
                  </Menu>
                </Group>

                {sections.length === 0 ? (
                  <Card withBorder radius="md" py={48}>
                    <Stack align="center" gap={4}>
                      <Text fw={600} size="sm">
                        No sections yet
                      </Text>
                      <Text c="dimmed" size="sm">
                        Add a section to start building this page.
                      </Text>
                    </Stack>
                  </Card>
                ) : (
                  sections.map((section, index) => (
                    <SectionInspector
                      key={section.key}
                      section={section}
                      index={index}
                      total={sections.length}
                      onChange={(data) => updateSection(index, data)}
                      onMove={(direction) => moveSection(index, direction)}
                      onRemove={() => removeSection(index)}
                    />
                  ))
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="seo">
              <Card withBorder radius="md" p="md">
                <Stack gap="sm">
                  <TextInput
                    label="Meta title"
                    description="Falls back to the page title when empty"
                    placeholder={title || 'Page title'}
                    value={seo.title}
                    onChange={(e) => setSeo((s) => ({ ...s, title: e.currentTarget.value }))}
                  />
                  <Textarea
                    label="Meta description"
                    description="Shown under the title in search results"
                    placeholder={description || 'A short summary for search results.'}
                    autosize
                    minRows={3}
                    value={seo.description}
                    onChange={(e) => setSeo((s) => ({ ...s, description: e.currentTarget.value }))}
                  />
                  <TextInput
                    label="Social share image"
                    description="Falls back to the hero image when empty"
                    placeholder="https://…"
                    value={seo.ogImage}
                    onChange={(e) => setSeo((s) => ({ ...s, ogImage: e.currentTarget.value }))}
                  />
                  <Divider my="xs" />
                  <Switch
                    label="Hide from search engines"
                    description="Adds a noindex tag to this page"
                    checked={seo.noIndex}
                    onChange={(e) => setSeo((s) => ({ ...s, noIndex: e.currentTarget.checked }))}
                  />
                </Stack>
              </Card>
            </Tabs.Panel>
          </Tabs>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            <Card withBorder radius="md" p="md">
              <Select
                label="Status"
                value={status}
                onChange={(value) => value && setStatus(value as PageStatus)}
                data={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                  { value: 'archived', label: 'Archived' },
                ]}
                allowDeselect={false}
                comboboxProps={{ withinPortal: true }}
              />
            </Card>

            <Card withBorder radius="md" p="md">
              <Stack gap="md">
                <ImageField
                  label="Hero image"
                  description="The wide banner at the top of the page"
                  value={heroImage}
                  onChange={setHeroImage}
                  ratio={16 / 9}
                />
                <Divider />
                <ImageField
                  label="Thumbnail"
                  description="Used in listings and social previews"
                  value={thumbnailImage}
                  onChange={setThumbnailImage}
                  ratio={4 / 3}
                />
              </Stack>
            </Card>

            {audit && (
              <Card withBorder radius="md" p="md">
                <Text size="sm" fw={600} mb="sm">
                  Details
                </Text>
                <Stack gap={8}>
                  <Meta label="Created" value={formatDate(audit.createdAt)} />
                  <Meta label="Created by" value={audit.createdBy?.name ?? '—'} />
                  <Divider my={2} />
                  <Meta label="Last updated" value={formatDate(audit.updatedAt)} />
                  <Meta label="Updated by" value={audit.updatedBy?.name ?? '—'} />
                  <Divider my={2} />
                  <Meta label="Published" value={formatDate(audit.publishedAt)} />
                </Stack>
              </Card>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
