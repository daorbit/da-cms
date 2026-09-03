import { Button, Card, Group, Menu, Stack, Text, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { RichTextField } from '@/modules/content/components/RichTextField';
import { BlockEditorField } from '@/modules/content/components/BlockEditorField';
import { SectionInspector } from '@/modules/content/sections/SectionInspector';
import { SECTION_LIST } from '@/modules/content/sections/registry';
import type { PageEditorType, PageSection, SectionType } from '@/types';

interface Props {
  editorType: PageEditorType;
  body: string;
  onBodyChange: (html: string) => void;
  bodyBlocks: unknown[];
  onBodyBlocksChange: (blocks: unknown[], html: string) => void;
  sections: PageSection[];
  onAddSection: (type: SectionType) => void;
  onUpdateSection: (index: number, data: Record<string, unknown>) => void;
  onMoveSection: (index: number, direction: -1 | 1) => void;
  onRemoveSection: (index: number) => void;
}

/**
 * The edit-mode pane: writing surface on the left, section blocks on the
 * right. Which writing surface renders depends on `editorType` — the two
 * editors store content in incompatible shapes, so only one is ever mounted.
 */
export function EditorSurface({
  editorType, body, onBodyChange, bodyBlocks, onBodyBlocksChange,
  sections, onAddSection, onUpdateSection, onMoveSection, onRemoveSection,
}: Props) {
  return (
    // The editor takes whatever the window gives it rather than sitting in a
    // capped column with dead bands either side — this is the screen the
    // work happens on.
    <div className="editor-grid">
      {editorType === 'block' ? (
        <BlockEditorField blocks={bodyBlocks} onChange={onBodyBlocksChange} placeholder="Start writing…" />
      ) : (
        <RichTextField value={body} onChange={onBodyChange} placeholder="Start writing…" />
      )}

      <Stack gap="sm" className="editor-rail">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Title order={5}>Sections</Title>
          <Menu shadow="md" width={240} position="bottom-end">
            <Menu.Target>
              <Button size="compact-sm" variant="light" leftSection={<IconPlus size={14} />}>
                Add
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {SECTION_LIST.map((definition) => (
                <Menu.Item key={definition.type} onClick={() => onAddSection(definition.type)}>
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
          <Card py="lg">
            <Stack align="center" gap={4}>
              <Text fw={600} size="sm">
                No sections
              </Text>
              <Text c="dimmed" size="xs" ta="center">
                Blocks render below the body, in the order you add them.
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
              onChange={(data) => onUpdateSection(index, data)}
              onMove={(direction) => onMoveSection(index, direction)}
              onRemove={() => onRemoveSection(index)}
            />
          ))
        )}
      </Stack>
    </div>
  );
}
