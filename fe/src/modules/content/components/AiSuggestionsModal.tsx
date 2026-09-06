import { useEffect, useMemo, useRef, useState } from 'react';
import { Group, Modal, Text, TextInput } from '@mantine/core';
import { IconCornerDownLeft, IconSearch } from '@tabler/icons-react';
import { OrbitMark } from '@/modules/content/components/OrbitMark';
import { PROMPT_GROUPS, needsSelection } from './aiPrompts';
import classes from './AiSuggestionsModal.module.css';

interface Props {
  opened: boolean;
  onClose: () => void;
  hasSelection: boolean;
  onPick: (prompt: string) => void;
}

export function AiSuggestionsModal({ opened, onClose, hasSelection, onPick }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

 
  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    return PROMPT_GROUPS.map((group) => ({
      ...group,
      prompts: group.prompts.filter(
        (p) => (hasSelection || !needsSelection(p)) && p.toLowerCase().includes(term)
      ),
    })).filter((group) => group.prompts.length > 0);
  }, [query, hasSelection]);

  const flat = useMemo(() => groups.flatMap((g) => g.prompts), [groups]);

  useEffect(() => {
    setActive(0);
  }, [query, hasSelection]);

  useEffect(() => {
    if (opened) setQuery('');
  }, [opened]);

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (prompt: string) => {
    onPick(prompt);
    onClose();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (i + 1) % Math.max(flat.length, 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (i - 1 + flat.length) % Math.max(flat.length, 1));
    }
    if (event.key === 'Enter' && flat[active]) {
      event.preventDefault();
      choose(flat[active]);
    }
  };

  let index = -1;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      size="lg"
      centered
      padding={0}
      classNames={{ content: classes.modal, body: classes.body }}
    >
      <div className={classes.searchRow}>
        <OrbitMark size={17} />
        <TextInput
          placeholder="Search prompts, or type to filter"
          leftSection={<IconSearch size={15} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={onKeyDown}
          variant="unstyled"
          autoFocus
          className={classes.search}
        />
      </div>

      <div className={classes.list} ref={listRef}>
        {flat.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            Nothing matches “{query}”.
          </Text>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div className={classes.groupLabel}>{group.label}</div>
              {group.prompts.map((prompt) => {
                index += 1;
                const at = index;
                return (
                  <button
                    key={prompt}
                    type="button"
                    className={classes.item}
                    data-active={at === active || undefined}
                    onMouseEnter={() => setActive(at)}
                    onClick={() => choose(prompt)}
                  >
                    <span className={classes.itemText}>
                      {prompt.endsWith(' ') ? `${prompt.trim()}…` : prompt}
                    </span>
                    {at === active && <IconCornerDownLeft size={13} />}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      <Group className={classes.footer} gap={14}>
        <Text size="xs" c="dimmed">
          ↑↓ to move · ↵ to pick · esc to close
        </Text>
        {!hasSelection && (
          <Text size="xs" c="dimmed" ml="auto">
            Select text to see rewrite prompts
          </Text>
        )}
      </Group>
    </Modal>
  );
}
