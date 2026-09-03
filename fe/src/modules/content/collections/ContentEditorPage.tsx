import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Container,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { api, ApiError } from '@/lib/api';
import { useWorkspace } from '@/hooks/useWorkspace';
import type { Collection, Content, ContentStatus } from '@/types';

export function ContentEditorPage() {
  const navigate = useNavigate();
  const { collectionId, id } = useParams();
  const workspace = useWorkspace();
  const isEdit = Boolean(id);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<{ data: Record<string, unknown>; status: ContentStatus }>({
    initialValues: { data: {}, status: 'draft' },
  });

  useEffect(() => {
    if (!workspace || !collectionId) return;
    api.get<Collection>(`/workspaces/${workspace.id}/collections/${collectionId}`).then(setCollection);
    if (id) {
      api
        .get<Content>(`/workspaces/${workspace.id}/collections/${collectionId}/content/${id}`)
        .then((content) => form.setValues({ data: content.data, status: content.status }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace, collectionId, id]);

  if (!workspace || !collectionId || !collection) return null;

  const handleSubmit = form.onSubmit(async (values) => {
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.patch(`/workspaces/${workspace.id}/collections/${collectionId}/content/${id}`, values);
      } else {
        await api.post(`/workspaces/${workspace.id}/collections/${collectionId}/content`, values);
      }
      navigate(`/${workspace.slug}/content/collections/${collectionId}/content`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Container size="sm">
      <Title order={2} mb="lg">
        {isEdit ? 'Edit entry' : 'New entry'}
      </Title>

      <form onSubmit={handleSubmit}>
        <Stack>
          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}

          {collection.fields.map((field) => {
            const path = `data.${field.key}`;
            switch (field.type) {
              case 'richtext':
                return (
                  <Textarea
                    key={field.key}
                    label={field.label}
                    minRows={5}
                    required={field.required}
                    {...form.getInputProps(path)}
                  />
                );
              case 'number':
                return (
                  <NumberInput
                    key={field.key}
                    label={field.label}
                    required={field.required}
                    {...form.getInputProps(path)}
                  />
                );
              case 'boolean':
                return (
                  <Switch
                    key={field.key}
                    label={field.label}
                    checked={Boolean(form.values.data[field.key])}
                    onChange={(e) => form.setFieldValue(path, e.currentTarget.checked)}
                  />
                );
              case 'date':
                return (
                  <TextInput
                    key={field.key}
                    type="date"
                    label={field.label}
                    required={field.required}
                    {...form.getInputProps(path)}
                  />
                );
              case 'image':
                return (
                  <TextInput
                    key={field.key}
                    label={field.label}
                    placeholder="https://…"
                    required={field.required}
                    {...form.getInputProps(path)}
                  />
                );
              default:
                return (
                  <TextInput
                    key={field.key}
                    label={field.label}
                    required={field.required}
                    {...form.getInputProps(path)}
                  />
                );
            }
          })}

          <Select
            label="Status"
            data={[
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
            ]}
            allowDeselect={false}
            {...form.getInputProps('status')}
          />

          <Group>
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Save changes' : 'Create entry'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Container>
  );
}
