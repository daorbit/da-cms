import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Container, Group, Skeleton, Stack, Table, Text, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/hooks/useWorkspace';
import type { Collection, Content } from '@/types';

export function ContentListPage() {
  const { collectionId } = useParams();
  const workspace = useWorkspace();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<Content[] | null>(null);

  useEffect(() => {
    if (!workspace || !collectionId) return;
    api.get<Collection>(`/workspaces/${workspace.id}/collections/${collectionId}`).then(setCollection);
    api
      .get<Content[]>(`/workspaces/${workspace.id}/collections/${collectionId}/content`)
      .then(setItems);
  }, [workspace, collectionId]);

  if (!workspace || !collectionId) return null;

  const titleField = collection?.fields[0]?.key;

  return (
    <Container size="md">
      <Group justify="space-between" mb="lg">
        <Title order={2}>{collection?.name ?? 'Content'}</Title>
        <Group>
          <Button
            variant="default"
            component={Link}
            to={`/${workspace.slug}/collections/${collectionId}/edit`}
          >
            Edit fields
          </Button>
          <Button
            component={Link}
            to={`/${workspace.slug}/collections/${collectionId}/content/new`}
            leftSection={<IconPlus size={16} />}
          >
            New entry
          </Button>
        </Group>
      </Group>

      {!items && (
        <Stack>
          <Skeleton height={40} />
          <Skeleton height={40} />
        </Stack>
      )}

      {items?.length === 0 && <Text c="dimmed">No entries yet.</Text>}

      {items && items.length > 0 && (
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{titleField ?? 'Entry'}</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => (
              <Table.Tr
                key={item.id}
                component={Link}
                to={`/${workspace.slug}/collections/${collectionId}/content/${item.id}/edit`}
                style={{ cursor: 'pointer' }}
              >
                <Table.Td>{titleField ? String(item.data[titleField] ?? '(untitled)') : item.id}</Table.Td>
                <Table.Td>
                  {/* Live/published state reads as emerald, everything else neutral. */}
                  <Badge color={item.status === 'published' ? 'green' : 'gray'} variant="light">
                    {item.status}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Container>
  );
}
