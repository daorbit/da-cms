import { useMemo, useState } from 'react';
import {
  ActionIcon, Badge, Box, Button, CopyButton, Divider, Group, Modal, ScrollArea, SegmentedControl,
  Stack, Text, Title, Tooltip,
} from '@mantine/core';
import { CodeHighlight } from '@mantine/code-highlight';
import { IconCheck, IconCopy, IconRotate, IconX } from '@tabler/icons-react';

interface Props {
  opened: boolean;
  onClose: () => void;
  /** Absolute base of the public content API, e.g. https://cms.example.com/api */
  apiBase: string;
  workspaceId: string;
}

type FrameworkId = 'nextjs' | 'react' | 'angular' | 'js' | 'curl';

const FRAMEWORKS: { id: FrameworkId; label: string; language: string; filename: string }[] = [
  { id: 'nextjs', label: 'Next.js', language: 'tsx', filename: 'app/[slug]/page.tsx' },
  { id: 'react', label: 'React', language: 'tsx', filename: 'CmsPage.tsx' },
  { id: 'angular', label: 'Angular', language: 'ts', filename: 'page.service.ts' },
  { id: 'js', label: 'JavaScript', language: 'js', filename: 'load-page.js' },
  { id: 'curl', label: 'cURL', language: 'bash', filename: 'terminal' },
];

const QUERY_PARAMS: { name: string; example: string; note: string }[] = [
  { name: 'fields', example: '?fields=title,content', note: 'Comma-separated keys to return. Toggle the keys below to build it.' },
  { name: 'format', example: '?format=html', note: 'Return a ready-to-frame HTML document instead of JSON.' },
];

const RESPONSE_KEYS = [
  'id', 'title', 'slug', 'description', 'group', 'tags',
  'heroImage', 'thumbnailImage', 'content', 'seo', 'status', 'publishedAt', 'updatedAt',
] as const;

const DEFAULT_FIELDS = ['title', 'content'];

/** A TS type literal for the selected fields, so the snippets stay typed. */
function fieldsType(fields: string[]): string {
  if (fields.length === 0) return 'Record<string, unknown>';
  const t: Record<string, string> = {
    id: 'string', title: 'string', slug: 'string', description: 'string', group: 'string',
    tags: 'string[]', heroImage: '{ url: string; alt: string }',
    thumbnailImage: '{ url: string; alt: string }', content: 'string',
    seo: '{ title: string; description: string; ogImage: string; noIndex: boolean }',
    status: '"draft" | "published" | "archived"', publishedAt: 'string | null', updatedAt: 'string',
  };
  return `{ ${fields.map((f) => `${f}: ${t[f] ?? 'unknown'}`).join('; ')} }`;
}

function buildSnippets(endpoint: string, fields: string[]): Record<FrameworkId, string> {
  const q = fields.length ? `?fields=${fields.join(',')}` : '';
  const url = `${endpoint}/YOUR_PAGE_SLUG${q}`;
  const Type = fieldsType(fields);
  const has = (f: string) => fields.length === 0 || fields.includes(f);
  const titleLine = has('title') ? '      <h1>{page.title}</h1>\n' : '';

  return {
    nextjs: `// app/[slug]/page.tsx — Server Component
type Page = ${Type};

async function getPage(slug: string): Promise<Page | null> {
  const res = await fetch(
    \`${endpoint}/\${slug}${q}\`,
    { next: { revalidate: 60 } }, // ISR — refetch at most once a minute
  );
  return res.ok ? res.json() : null;
}

export default async function Page({ params }: { params: { slug: string } }) {
  const page = await getPage(params.slug);
  if (!page) notFound();

  return (
    <article className="prose">
${titleLine}      <div dangerouslySetInnerHTML={{ __html: page.content }} />
    </article>
  );
}`,

    react: `import { useEffect, useState } from 'react';

type Page = ${Type};

export function CmsPage({ slug }: { slug: string }) {
  const [page, setPage] = useState<Page | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(\`${endpoint}/\${slug}${q}\`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => alive && setPage(data))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug]);

  if (!page) return <p>Loading…</p>;

  return (
    <article>
${titleLine}      <div dangerouslySetInnerHTML={{ __html: page.content }} />
    </article>
  );
}`,

    angular: `// page.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface CmsPage ${Type}

@Injectable({ providedIn: 'root' })
export class PageService {
  constructor(private http: HttpClient) {}

  getPage(slug: string): Observable<CmsPage> {
    return this.http.get<CmsPage>(\`${endpoint}/\${slug}\`${
      fields.length ? `, {\n      params: { fields: '${fields.join(',')}' },\n    }` : ''
    });
  }
}

// template:  <div [innerHTML]="(page$ | async)?.content"></div>`,

    js: `// Plain fetch — any modern browser or Node 18+
async function loadPage(slug) {
  const res = await fetch(\`${endpoint}/\${slug}${q}\`);
  if (!res.ok) throw new Error(\`Page "\${slug}" not found\`);
  return res.json();
}

const page = await loadPage('YOUR_PAGE_SLUG');
${has('title') ? "document.querySelector('#page-title').textContent = page.title;\n" : ''}document.querySelector('#page-body').innerHTML = page.content;`,

    curl: `# The page as JSON${fields.length ? ' (selected fields only)' : ''}
curl "${url}"

# Rendered HTML document (what the preview frames)
curl "${endpoint}/YOUR_PAGE_SLUG?format=html"`,
  };
}

/**
 * Full-screen integration guide: how an external site pulls a published page's
 * content out of this CMS through the public, no-auth content API. Toggling the
 * response keys rewrites every snippet's `?fields=` and its response type.
 */
export function PageIntegrationModal({ opened, onClose, apiBase, workspaceId }: Props) {
  const [framework, setFramework] = useState<FrameworkId>('nextjs');
  const [fields, setFields] = useState<string[]>(DEFAULT_FIELDS);

  const endpoint = `${apiBase.replace(/\/$/, '')}/workspaces/${workspaceId}/pagebyslug`;
  const snippets = useMemo(() => buildSnippets(endpoint, fields), [endpoint, fields]);
  const active = FRAMEWORKS.find((f) => f.id === framework)!;
  const code = snippets[framework];

  const toggleField = (key: string) =>
    setFields((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));

  const fieldsQuery = fields.length ? `?fields=${fields.join(',')}` : '(all fields)';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      fullScreen
      withCloseButton={false}
      padding={0}
      transitionProps={{ transition: 'fade', duration: 150 }}
      styles={{
        body: { height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
      }}
    >
      <Group
        justify="space-between"
        wrap="nowrap"
        px="lg"
        style={{
          height: 56,
          flexShrink: 0,
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Group gap="sm" wrap="nowrap">
          <Title order={4}>Use these pages in your app</Title>
          <Badge variant="light" color="teal" size="sm">
            Public API · no key
          </Badge>
        </Group>
        <ActionIcon variant="subtle" color="gray" size="lg" onClick={onClose} aria-label="Close">
          <IconX size={19} />
        </ActionIcon>
      </Group>

      <Box style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* Left: reference + the field picker */}
        <ScrollArea
          type="auto"
          style={{
            width: 360,
            flexShrink: 0,
            borderRight: '1px solid var(--mantine-color-default-border)',
          }}
        >
          <Stack gap="lg" p="lg">
            <div>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6}>
                Endpoint
              </Text>
              <Box
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--mantine-radius-md)',
                  background: 'var(--mantine-color-default)',
                  border: '1px solid var(--mantine-color-default-border)',
                  fontFamily: 'var(--mantine-font-family-monospace)',
                  fontSize: 12,
                  lineHeight: 1.6,
                  wordBreak: 'break-all',
                }}
              >
                <Text span c="teal" fw={700}>
                  GET{' '}
                </Text>
                {endpoint}/<Text span c="dimmed">{'{slug}'}</Text>
                <Text span c="blue">
                  {fields.length ? `?fields=${fields.join(',')}` : ''}
                </Text>
              </Box>
              <Group justify="flex-end" mt={6}>
                <CopyButton value={`${endpoint}/{slug}${fields.length ? `?fields=${fields.join(',')}` : ''}`}>
                  {({ copied, copy }) => (
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      leftSection={copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
                      onClick={copy}
                    >
                      {copied ? 'Copied' : 'Copy URL'}
                    </Button>
                  )}
                </CopyButton>
              </Group>
              <Text size="xs" c="dimmed">
                Returns the published page with that slug. Drafts and archived pages 404.
              </Text>
            </div>

            <Divider />

            <div>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={8}>
                Query parameters
              </Text>
              <Stack gap="sm">
                {QUERY_PARAMS.map((p) => (
                  <div key={p.name}>
                    <Group gap={6} align="baseline">
                      <Text size="sm" fw={600} ff="monospace">
                        {p.name}
                      </Text>
                      <Text size="xs" c="dimmed" ff="monospace">
                        {p.example}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {p.note}
                    </Text>
                  </div>
                ))}
              </Stack>
            </div>

            <Divider />

            <div>
              <Group justify="space-between" mb={8}>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  Response keys
                </Text>
                <Group gap={4}>
                  <Tooltip label="Select all" withArrow>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="gray"
                      onClick={() => setFields([...RESPONSE_KEYS])}
                      aria-label="Select all fields"
                    >
                      <IconCheck size={13} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Reset" withArrow>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="gray"
                      onClick={() => setFields(DEFAULT_FIELDS)}
                      aria-label="Reset fields"
                    >
                      <IconRotate size={13} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>

              <Text size="xs" c="dimmed" mb={8}>
                Click a key to add or remove it from <b>?fields=</b>. With none selected the full
                object is returned.
              </Text>

              <Group gap={6}>
                {RESPONSE_KEYS.map((k) => {
                  const on = fields.includes(k);
                  return (
                    <Badge
                      key={k}
                      component="button"
                      type="button"
                      onClick={() => toggleField(k)}
                      variant={on ? 'filled' : 'default'}
                      color={on ? 'blue' : 'gray'}
                      size="sm"
                      radius="sm"
                      ff="monospace"
                      tt="none"
                      style={{ cursor: 'pointer' }}
                    >
                      {k}
                    </Badge>
                  );
                })}
              </Group>

              <Box
                mt={10}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--mantine-radius-sm)',
                  background: 'var(--mantine-color-default)',
                  border: '1px solid var(--mantine-color-default-border)',
                  fontFamily: 'var(--mantine-font-family-monospace)',
                  fontSize: 11.5,
                  color: 'var(--mantine-color-dimmed)',
                  wordBreak: 'break-all',
                }}
              >
                {fieldsQuery}
              </Box>

              <Text size="xs" c="dimmed" mt={8}>
                <b>content</b> is HTML from the editor — render it with your framework&apos;s raw-HTML
                escape hatch.
              </Text>
            </div>
          </Stack>
        </ScrollArea>

        {/* Right: code editor surface */}
        <Box
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            background: '#0d1117',
          }}
        >
          <Group
            justify="space-between"
            wrap="nowrap"
            px="lg"
            py="sm"
            style={{ borderBottom: '1px solid #1f2630', flexShrink: 0 }}
          >
            <SegmentedControl
              size="xs"
              value={framework}
              onChange={(v) => setFramework(v as FrameworkId)}
              data={FRAMEWORKS.map((f) => ({ value: f.id, label: f.label }))}
            />
          </Group>

          {/* Editor "tab" strip: filename + copy, aligned on one row. */}
          <Group
            justify="space-between"
            wrap="nowrap"
            px="lg"
            py={8}
            style={{ borderBottom: '1px solid #1f2630', flexShrink: 0 }}
          >
            <Group gap={8} wrap="nowrap">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: '#3b82f6',
                  flexShrink: 0,
                }}
              />
              <Text size="xs" ff="monospace" c="#c9d1d9">
                {active.filename}
              </Text>
              <Text size="xs" c="dimmed">
                · swap YOUR_PAGE_SLUG for a real slug
              </Text>
            </Group>
            <CopyButton value={code}>
              {({ copied, copy }) => (
                <Button
                  size="compact-xs"
                  variant={copied ? 'light' : 'default'}
                  color={copied ? 'teal' : 'gray'}
                  leftSection={copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
                  onClick={copy}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              )}
            </CopyButton>
          </Group>

          <ScrollArea type="auto" style={{ flex: 1, minHeight: 0 }} data-mantine-color-scheme="dark">
            <CodeHighlight
              code={code}
              language={active.language}
              withCopyButton={false}
              withBorder={false}
              style={{ background: 'transparent' }}
              styles={{
                root: { border: 0, borderRadius: 0, background: 'transparent' },
                pre: {
                  fontSize: 13,
                  lineHeight: 1.75,
                  padding: 'var(--mantine-spacing-lg)',
                  background: 'transparent',
                },
                code: { background: 'transparent', color: '#c9d1d9' },
              }}
            />
          </ScrollArea>
        </Box>
      </Box>
    </Modal>
  );
}
