import { Card, Divider, Stack, Text, Title } from '@mantine/core';
import { SectionPreview } from '@/modules/content/sections/SectionPreview';
import type { PageImage, PageSection } from '@/types';

interface Props {
  title: string;
  description: string;
  heroImage: PageImage;
  body: string;
  sections: PageSection[];
}

/**
 * Read-only render of the page as it would appear published. Works from
 * `body` HTML regardless of which editor produced it — BlockNote exports
 * HTML on every change for exactly this purpose.
 */
export function PagePreview({ title, description, heroImage, body, sections }: Props) {
  return (
    // The preview keeps a measure cap: it is prose to be read, and a line of
    // body copy running the full width of a monitor is unreadable.
    <div style={{ width: '100%', maxWidth: 820, marginInline: 'auto' }}>
      <Card p="xl">
        <Stack gap={0}>
          {heroImage.url && <ImagePreview url={heroImage.url} alt={heroImage.alt} />}

          <Title order={1} mt={heroImage.url ? 'lg' : 0}>
            {title || 'Untitled'}
          </Title>
          {description && (
            <Text c="dimmed" mt="xs">
              {description}
            </Text>
          )}

          {body && (
            <>
              <Divider my="lg" />
              {/* The editor's own HTML, rendered as it was authored. It comes
                  from this app's own TipTap/BlockNote instance, not from
                  user-supplied markup, so there is nothing here to sanitise
                  against. */}
              <div className="page-preview-body" dangerouslySetInnerHTML={{ __html: body }} />
            </>
          )}

          {sections.map((section) => (
            <div key={section.key}>
              <Divider my="lg" />
              <SectionPreview section={section} />
            </div>
          ))}

          {!body && sections.length === 0 && (
            <Text c="dimmed" ta="center" py={40}>
              Nothing to preview yet.
            </Text>
          )}
        </Stack>
      </Card>
    </div>
  );
}

function ImagePreview({ url, alt }: { url: string; alt: string }) {
  return (
    <img
      src={url}
      alt={alt}
      style={{ width: '100%', borderRadius: 10, display: 'block', objectFit: 'cover' }}
    />
  );
}
