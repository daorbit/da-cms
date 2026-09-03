import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ActionIcon,
  Alert,
  Button,
  Container,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { api, ApiError } from '@/lib/api';
import { useWorkspace } from '@/hooks/useWorkspace';
import type { Collection, CollectionField, FieldType } from '@/types';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'richtext', label: 'Rich text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'image', label: 'Image URL' },
];

export function CollectionFormPage() {
  const navigate = useNavigate();
  const { collectionId } = useParams();
  const workspace = useWorkspace();
  const isEdit = Boolean(collectionId);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<{ name: string; fields: CollectionField[] }>({
    initialValues: { name: '', fields: [] },
    validate: {
      name: (v) => (v.trim().length === 0 ? 'Name is required' : null),
    },
  });

  useEffect(() => {
    if (!workspace || !collectionId) return;
    api.get<Collection>(`/workspaces/${workspace.id}/collections/${collectionId}`).then((c) => {
      form.setValues({ name: c.name, fields: c.fields });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace, collectionId]);

  if (!workspace) return null;

  const addField = () => {
    form.insertListItem('fields', { key: '', label: '', type: 'text', required: false });
  };

  const handleSubmit = form.onSubmit(async (values) => {
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.patch(`/workspaces/${workspace.id}/collections/${collectionId}`, values);
      } else {
        await api.post(`/workspaces/${workspace.id}/collections`, values);
      }
      navigate(`/${workspace.slug}/content/collections`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Container size="sm">
      <Title order={2} mb="lg">
        {isEdit ? 'Edit collection' : 'New collection'}
      </Title>

      <form onSubmit={handleSubmit}>
        <Stack>
          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}

          <TextInput label="Name" placeholder="Blog" {...form.getInputProps('name')} />

          <Group justify="space-between" mt="md">
            <Text fw={500}>Fields</Text>
            <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={addField}>
              Add field
            </Button>
          </Group>

          {form.values.fields.length === 0 && (
            <Text c="dimmed" size="sm">
              No fields yet.
            </Text>
          )}

          {form.values.fields.map((_, index) => (
            <Paper key={index} withBorder p="sm">
              <Group align="flex-end" wrap="nowrap">
                <TextInput
                  label="Key"
                  placeholder="title"
                  style={{ flex: 1 }}
                  {...form.getInputProps(`fields.${index}.key`)}
                />
                <TextInput
                  label="Label"
                  placeholder="Title"
                  style={{ flex: 1 }}
                  {...form.getInputProps(`fields.${index}.label`)}
                />
                <Select
                  label="Type"
                  data={FIELD_TYPES}
                  allowDeselect={false}
                  style={{ flex: 1 }}
                  {...form.getInputProps(`fields.${index}.type`)}
                />
                <ActionIcon color="red" variant="subtle" mb={4} onClick={() => form.removeListItem('fields', index)}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Paper>
          ))}

          <Button type="submit" loading={submitting} mt="md">
            {isEdit ? 'Save changes' : 'Create collection'}
          </Button>
        </Stack>
      </form>
    </Container>
  );
}
