import { useState } from 'react';
import {
  Box,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { OrbitMark } from '@/modules/content/components/OrbitMark';
import classes from './AiSuggestionsModal.module.css';

/**
 * The prompt catalogue.
 *
 * Written as lead-ins the writer finishes rather than as finished instructions:
 * a prompt ending in "about " puts the caret where the topic goes, which is the
 * only part that differs between one use and the next. Grouped, because a flat
 * list of two dozen is read as noise.
 */
const GROUPS: { label: string; prompts: string[] }[] = [
  {
    label: 'Write something new',
    prompts: [
      'Write a full blog post about ',
      'Write a detailed case study about ',
      'Write a step-by-step guide to ',
      'Write a product announcement for ',
      'Write an opinion piece arguing that ',
      'Write a beginner-friendly explainer on ',
      'Write a technical deep dive into ',
    ],
  },
  {
    label: 'Compare and analyse',
    prompts: [
      'Compare the main options for ',
      'Write a pros and cons breakdown of ',
      'Explain the trade-offs between ',
      'Write a migration guide from ',
      'Debunk the common myths about ',
    ],
  },
  {
    label: 'Structure and sections',
    prompts: [
      'Write an introduction for a post about ',
      'Write a conclusion that summarises ',
      'Write an FAQ section covering ',
      'Write a comparison table of ',
      'Add a callout explaining why ',
      'Write a short summary of the section above',
    ],
  },
  {
    label: 'Improve what is here',
    prompts: [
      'Rewrite the selected text to be clearer and shorter',
      'Rewrite the selected text in a more formal voice',
      'Rewrite the selected text in plain English',
      'Expand the selected text with more detail and examples',
      'Turn the selected text into a bulleted list',
      'Fix the grammar and punctuation in the selected text',
      'Make the selected text more persuasive',
    ],
  },
  {
    label: 'Search and social',
    prompts: [
      'Write a meta description for this page',
      'Suggest five headline options for this page',
      'Write a short social post announcing this page',
    ],
  },
];

interface Props {
  opened: boolean;
  onClose: () => void;
  /** Whether the writer has a selection, so rewrite prompts make sense. */
  hasSelection: boolean;
  onPick: (prompt: string) => void;
}

export function AiSuggestionsModal({ opened, onClose, hasSelection, onPick }: Props) {
  const [query, setQuery] = useState('');

  const term = query.trim().toLowerCase();
  const groups = GROUPS.map((group) => ({
    ...group,
    prompts: group.prompts.filter((p) => p.toLowerCase().includes(term)),
  })).filter((group) => group.prompts.length > 0);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8}>
          <OrbitMark size={20} />
          <Text fw={600} size="sm">
            What should Orbit write?
          </Text>
        </Group>
      }
      size="lg"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="md">
        <TextInput
          placeholder="Search prompts"
          leftSection={<IconSearch size={15} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          autoFocus
        />

        {!hasSelection && (
          <Text size="xs" c="dimmed">
            Prompts that rewrite text need a selection in the editor first.
          </Text>
        )}

        {groups.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="lg">
            Nothing matches “{query}”.
          </Text>
        ) : (
          groups.map((group) => (
            <Stack gap={6} key={group.label}>
              <Text
                size="xs"
                fw={600}
                tt="uppercase"
                c="dimmed"
                style={{ letterSpacing: '0.04em' }}
              >
                {group.label}
              </Text>

              <Box className={classes.grid}>
                {group.prompts.map((prompt) => {
                  // A rewrite prompt with nothing selected would send the model
                  // an instruction about text it cannot see.
                  const needsSelection = prompt.includes('selected text');
                  const disabled = needsSelection && !hasSelection;

                  return (
                    <UnstyledButton
                      key={prompt}
                      className={classes.item}
                      data-disabled={disabled || undefined}
                      disabled={disabled}
                      onClick={() => {
                        onPick(prompt);
                        onClose();
                      }}
                    >
                      <Text size="xs" lh={1.45}>
                        {/* A trailing space means the prompt is a lead-in the
                            writer finishes, so it is shown as one. */}
                        {prompt.endsWith(' ') ? `${prompt.trim()}…` : prompt}
                      </Text>
                    </UnstyledButton>
                  );
                })}
              </Box>
            </Stack>
          ))
        )}
      </Stack>
    </Modal>
  );
}
