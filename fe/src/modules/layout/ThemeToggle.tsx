import { SegmentedControl, useMantineColorScheme, Center, Tooltip, Menu, ActionIcon } from '@mantine/core';
import { IconSun, IconMoon, IconDeviceDesktop, IconCheck } from '@tabler/icons-react';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: IconSun },
  { value: 'dark', label: 'Dark', icon: IconMoon },
  { value: 'auto', label: 'System', icon: IconDeviceDesktop },
] as const;

type Scheme = (typeof OPTIONS)[number]['value'];

/**
 * Three states rather than a two-way switch: "auto" is the default, and a plain
 * toggle gives no way back to it once a user has picked a side.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  if (compact) {
    const current = OPTIONS.find((option) => option.value === colorScheme) ?? OPTIONS[2];

    return (
      <Menu shadow="md" width={160} position="right-end" withArrow>
        <Menu.Target>
          <Tooltip label={`Theme: ${current.label}`} position="right" withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              radius="md"
              className="app-nav-toggle app-nav-theme"
              aria-label="Change theme"
            >
              <current.icon size={18} stroke={1.6} />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Theme</Menu.Label>
          {OPTIONS.map((option) => (
            <Menu.Item
              key={option.value}
              leftSection={<option.icon size={14} stroke={1.7} />}
              rightSection={option.value === colorScheme ? <IconCheck size={14} /> : null}
              onClick={() => setColorScheme(option.value)}
            >
              {option.label}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    );
  }

  return (
    <SegmentedControl
      fullWidth
      size="xs"
      radius="md"
      value={colorScheme}
      onChange={(value) => setColorScheme(value as Scheme)}
      data={OPTIONS.map((option) => ({
        value: option.value,
        label: (
          <Tooltip label={option.label} openDelay={400} withArrow>
            <Center>
              <option.icon size={15} stroke={1.7} />
            </Center>
          </Tooltip>
        ),
      }))}
    />
  );
}
