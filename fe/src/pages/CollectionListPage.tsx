import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Container, Group, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/hooks/useWorkspace';
import type { Collection } from '@/types';

export function CollectionListPage() {
  const workspace = useWorkspace();
  const [collections, setCollections] = useState<Collection[] | null>(null);

  useEffect(() => {
    if (!workspace) return;
    api.get<Collection[]>(`/workspaces/${workspace.id}/collections`).then(setCollections);
  }, [workspace]);

  if (!workspace) return null;

  return (
    <Container size="md">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Content types</Title>
        <Button component={Link} to={`/${workspace.slug}/collections/new`} leftSection={<IconPlus size={16} />}>
          New collection
        </Button>
      </Group>

      {!collections && (
        <Stack>
          <Skeleton height={72} />
          <Skeleton height={72} />
        </Stack>
      )}

      {collections?.length === 0 && (
        <Text c="dimmed">No collections yet. Create one to start adding content — a blog, a product list, anything.</Text>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {collections?.map((c) => (
          <Card key={c.id} withBorder padding="lg" component={Link} to={`/${workspace.slug}/collections/${c.id}/content`}>
            <Text fw={600}>{c.name}</Text>
            <Text size="sm" c="dimmed">
              {c.fields.length} field{c.fields.length === 1 ? '' : 's'}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}
