import { useMemo, useState } from 'react';
import {
  ActionIcon, Code, CopyButton, Modal, ScrollArea, Stack, Tabs, Text, Tooltip,
} from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';

interface Props {
  opened: boolean;
  onClose: () => void;
  /** Absolute base of the public content API, e.g. https://cms.example.com/api */
  apiBase: string;
  workspaceId: string;
}

type SnippetId = 'curl' | 'fetch' | 'nextjs' | 'react' | 'angular';

const TABS: { value: SnippetId; label: string }[] = [
  { value: 'curl', label: 'cURL' },
  { value: 'fetch', label: 'JavaScript' },
  { value: 'nextjs', label: 'Next.js' },
  { value: 'react', label: 'React' },
  { value: 'angular', label: 'Angular' },
];

function buildSnippets(endpoint: string): Record<SnippetId, string> {
  const bySlug = `${endpoint}/YOUR_PAGE_SLUG`;

  return {
    curl: `# Full page as JSON
curl "${bySlug}"

# Only the fields you need
curl "${bySlug}?fields=title,content,slug"

# Rendered HTML document
curl "${bySlug}?format=html"`,

    fetch: `const res = await fetch(
  "${bySlug}?fields=title,content"
);
if (!res.ok) throw new Error("Page not found");
const page = await res.json();
// { title, content }
document.querySelector("#page").innerHTML = page.content;`,

    nextjs: `// app/[slug]/page.tsx  (Server Component)
async function getPage(slug: string) {
  const res = await fetch(
    \`${endpoint}/\${slug}?fields=title,content,seo\`,
    { next: { revalidate: 60 } } // ISR: refetch at most once a minute
  );
  if (!res.ok) return null;
  return res.json();
}

export default async function Page({
  params,
}: {
  params: { slug: string };
}) {
  const page = await getPage(params.slug);
  if (!page) return <div>Not found</div>;

  return (
    <article>
      <h1>{page.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: page.content }} />
    </article>
  );
}`,

    react: `import { useEffect, useState } from "react";

export function CmsPage({ slug }: { slug: string }) {
  const [page, setPage] = useState<{ title: string; content: string } | null>(null);

  useEffect(() => {
    fetch(\`${endpoint}/\${slug}?fields=title,content\`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setPage);
  }, [slug]);

  if (!page) return null;

  return (
    <article>
      <h1>{page.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: page.content }} />
    </article>
  );
}`,

    angular: `// page.service.ts
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class PageService {
  constructor(private http: HttpClient) {}

  getPage(slug: string) {
    return this.http.get<{ title: string; content: string }>(
      \`${endpoint}/\${slug}\`,
      { params: { fields: "title,content" } }
    );
  }
}

// page.component.ts
// this.pageService.getPage(slug).subscribe(page => this.page = page);
// template:  <div [innerHTML]="page.content"></div>`,
  };
}

/**
 * Copy-paste recipes for pulling a published page's content into an external
 * site through the public content API. No auth — the endpoint only ever serves
 * published pages.
 */
export function PageIntegrationModal({ opened, onClose, apiBase, workspaceId }: Props) {
  const [tab, setTab] = useState<SnippetId>('nextjs');

  const endpoint = `${apiBase.replace(/\/$/, '')}/workspaces/${workspaceId}/pagebyslug`;
  const snippets = useMemo(() => buildSnippets(endpoint), [endpoint]);
  const current = snippets[tab];

  return (
    <Modal opened={opened} onClose={onClose} title="Use these pages in your app" size="xl" centered>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Every published page is readable at this endpoint — no key needed. Swap{' '}
          <Code>YOUR_PAGE_SLUG</Code> for a page&apos;s slug, and use <Code>?fields=</Code> to return
          only the keys you want.
        </Text>

        <div>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>
            Endpoint
          </Text>
          <CodeBlock text={`${endpoint}/{slug}`} />
        </div>

        <Tabs value={tab} onChange={(v) => setTab((v as SnippetId) ?? 'nextjs')}>
          <Tabs.List>
            {TABS.map((t) => (
              <Tabs.Tab key={t.value} value={t.value}>
                {t.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          <div style={{ paddingTop: 'var(--mantine-spacing-sm)' }}>
            <CodeBlock text={current} scroll />
          </div>
        </Tabs>
      </Stack>
    </Modal>
  );
}

function CodeBlock({ text, scroll }: { text: string; scroll?: boolean }) {
  const body = (
    <Code
      block
      style={{
        fontSize: 12.5,
        lineHeight: 1.6,
        padding: '12px 14px',
        margin: 0,
        whiteSpace: 'pre',
      }}
    >
      {text}
    </Code>
  );

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 1 }}>
        <CopyButton value={text}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow>
              <ActionIcon variant="default" size="sm" onClick={copy} aria-label="Copy code">
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      </div>
      {scroll ? (
        <ScrollArea.Autosize mah={360} type="auto">
          {body}
        </ScrollArea.Autosize>
      ) : (
        body
      )}
    </div>
  );
}
