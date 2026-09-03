import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Alert, Button, Card, Center, Loader, Stack, Text, Title,
} from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';
import { inviteService, type InvitePreview } from '@/modules/workspace/workspaceService';

/**
 * Landing screen for an emailed invite link (`/invite/:token`). Shows the
 * workspace + role, then either accepts (signed in) or routes to login with a
 * return path.
 */
export function InviteAcceptPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, refresh } = useAuth();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    inviteService
      .preview(token)
      .then(setPreview)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'This invite is not valid'))
      .finally(() => setLoading(false));
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    setError(null);
    try {
      const { workspace } = await inviteService.accept(token);
      await refresh();
      navigate(workspace ? `/${workspace.slug}/dashboard` : '/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not accept the invite');
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  return (
    <Center h="100vh" p="md">
      <Card withBorder radius="lg" p="xl" maw={420} w="100%">
        <Stack>
          <Title order={3}>Workspace invite</Title>

          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}

          {preview && (
            <Text>
              You&apos;ve been invited to join{' '}
              <strong>{preview.workspace?.name ?? 'a workspace'}</strong> as{' '}
              <strong>{preview.role}</strong>, at <strong>{preview.email}</strong>.
            </Text>
          )}

          {!user ? (
            <>
              <Text c="dimmed" size="sm">
                Sign in with {preview?.email ?? 'the invited address'} to accept.
              </Text>
              <Button
                component={Link}
                to={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
              >
                Sign in to accept
              </Button>
              <Button
                component={Link}
                variant="subtle"
                to={`/signup?next=${encodeURIComponent(`/invite/${token}`)}`}
              >
                Create an account
              </Button>
            </>
          ) : (
            <Button onClick={accept} loading={accepting} disabled={!preview}>
              Accept invite
            </Button>
          )}
        </Stack>
      </Card>
    </Center>
  );
}
