import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Container, Paper, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { Workspace } from '@/types';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    initialValues: { name: '' },
    validate: {
      name: (v) => (v.trim().length === 0 ? 'Give your workspace a name' : null),
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setError(null);
    setSubmitting(true);
    try {
      const workspace = await api.post<Workspace>('/workspaces', values);
      await refresh();
      navigate(`/${workspace.slug}/collections`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Container size={420} py={80}>
      <Title order={2} ta="center">
        Set up your workspace
      </Title>
      <Text ta="center" c="dimmed" mt="xs">
        This is where your content lives. You can create more later.
      </Text>
      <Paper withBorder shadow="sm" p="lg" mt="lg" radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}
            <TextInput label="Workspace name" placeholder="Acme Inc." {...form.getInputProps('name')} />
            <Button type="submit" loading={submitting} fullWidth>
              Create workspace
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
