import { useDisclosure } from '@mantine/hooks';

export function useSidebarCollapsed() {
  const [collapsed, { toggle }] = useDisclosure(true);

  return { collapsed, toggle };
}
