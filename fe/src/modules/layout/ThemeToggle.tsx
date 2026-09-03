import { SegmentedControl, useMantineColorScheme, Center, Tooltip } from '@mantine/core';
import { IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: IconSun },
  { value: 'dark', label: 'Dark', icon: IconMoon },
  { value: 'auto', label: 'System', icon: IconDeviceDesktop },
] as const;

/**
 * Three states rather than a two-way switch: "auto" is the default, and a plain
 * toggle gives no way back to it once a user has picked a side.
 */
export function ThemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <SegmentedControl
      fullWidth
      size="xs"
      radius="md"
      value={colorScheme}
      onChange={(value) => setColorScheme(value as 'light' | 'dark' | 'auto')}
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
