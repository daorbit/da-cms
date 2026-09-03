import { ActionIcon, Card, Group, Stack, Text, TextInput, Textarea, Badge } from '@mantine/core';
import { IconChevronUp, IconChevronDown, IconTrash, IconGripVertical } from '@tabler/icons-react';
import { SECTION_DEFINITIONS } from './registry';
import type { PageSection } from '@/types';

interface Props {
  section: PageSection;
  index: number;
  total: number;
  onChange: (data: Record<string, unknown>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

/**
 * Renders one block's fields from its registry definition. Nothing here knows
 * what a hero or a CTA is — it walks `fields` and picks an input per type.
 */
export function SectionInspector({ section, index, total, onChange, onMove, onRemove }: Props) {
  const definition = SECTION_DEFINITIONS[section.type];

  const setField = (key: string, value: string) => onChange({ ...section.data, [key]: value });
  const valueOf = (key: string) => String(section.data[key] ?? '');

  return (
    <Card withBorder radius="md" p="md">
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <IconGripVertical size={16} opacity={0.35} />
          <div>
            <Group gap={6}>
              <Text fw={600} size="sm">
                {definition.label}
              </Text>
              <Badge size="xs" variant="light" color="gray">
                {index + 1}
              </Badge>
            </Group>
            <Text c="dimmed" size="xs">
              {definition.description}
            </Text>
          </div>
        </Group>

        <Group gap={4} wrap="nowrap">
          <ActionIcon
            variant="subtle"
            color="gray"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label="Move section up"
          >
            <IconChevronUp size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="gray"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label="Move section down"
          >
            <IconChevronDown size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={onRemove} aria-label="Remove section">
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Group>

      <Stack gap="sm">
        {definition.fields.map((field) =>
          field.type === 'textarea' ? (
            <Textarea
              key={field.key}
              label={field.label}
              placeholder={field.placeholder}
              autosize
              minRows={3}
              value={valueOf(field.key)}
              onChange={(e) => setField(field.key, e.currentTarget.value)}
            />
          ) : (
            <TextInput
              key={field.key}
              label={field.label}
              placeholder={field.placeholder}
              value={valueOf(field.key)}
              onChange={(e) => setField(field.key, e.currentTarget.value)}
            />
          )
        )}
      </Stack>
    </Card>
  );
}
