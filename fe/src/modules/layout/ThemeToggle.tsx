import { Menu, useMantineColorScheme } from '@mantine/core';
import { IconCheck, IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react';

const OPTIONS = [
  { value: 'auto', label: 'Match system', icon: IconDeviceDesktop },
  { value: 'light', label: 'Light', icon: IconSun },
  { value: 'dark', label: 'Dark', icon: IconMoon },
] as const;

/**
 * Appearance choices for a menu. "Match system" comes first and is the default,
 * so the app follows the OS unless someone deliberately overrides it.
 */
export function ThemeMenuItems() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <>
      <Menu.Label>Appearance</Menu.Label>
      {OPTIONS.map((option) => (
        <Menu.Item
          key={option.value}
          leftSection={<option.icon size={15} stroke={1.7} />}
          rightSection={option.value === colorScheme ? <IconCheck size={14} /> : null}
          onClick={() => setColorScheme(option.value)}
        >
          {option.label}
        </Menu.Item>
      ))}
    </>
  );
}
