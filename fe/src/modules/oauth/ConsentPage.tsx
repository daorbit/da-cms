import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Group, List, Skeleton, Stack, Text } from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';
import { AuthBrand } from '@/modules/auth/components/AuthBrand';
import { oauthService, type ConsentRequest } from '@/modules/oauth/oauthService';

const PERMISSIONS = [
  'See the workspaces you belong to',
  'Read, create and edit pages and blog posts',
  'Upload and generate images in your media library',
  'Publish pages when you ask it to',
];

/**
 * The OAuth consent step (`/oauth/consent?ticket=…`) an MCP client such as
 * claude.ai sends the user through. Signed in by `RequireAuth`; the answer is
 * posted back and the browser follows the redirect to the client.
 */
export function ConsentPage() {
  const [params] = useSearchParams();
  const ticket = params.get('ticket') ?? '';
  const { user } = useAuth();

  const [request, setRequest] = useState<ConsentRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    oauthService
      .describe(ticket)
      .then(setRequest)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'This sign-in request is not valid'));
  }, [ticket]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const { redirectUrl } = await oauthService.decide(ticket, approve);
      window.location.assign(redirectUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not complete the request');
      setBusy(false);
    }
  };

  return (
    <div className="auth-split">
      <AuthBrand
        headline="Write and publish with Claude"
        subline="Let Claude draft posts, create images and fill in SEO in your workspace."
      />

      <div className="auth-panel">
        <div className="auth-form">
          <Stack gap="lg">
            <div>
              <h1 className="auth-title">Allow access?</h1>
              {request ? (
                <p className="auth-subtitle">
                  <strong>{request.clientName}</strong> wants to use da-cms as {user?.email}.
                </p>
              ) : (
                !error && <Skeleton height={14} width="80%" radius="sm" mt="xs" />
              )}
            </div>

            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}

            {request && (
              <>
                <Stack gap={6}>
                  <Text size="sm" fw={600}>
                    It will be able to:
                  </Text>
                  <List size="sm" spacing={4}>
                    {PERMISSIONS.map((permission) => (
                      <List.Item key={permission}>{permission}</List.Item>
                    ))}
                  </List>
                </Stack>

                <Text size="xs" c="dimmed">
                  You will be sent back to {request.redirectHost}. Only allow access for applications you trust.
                </Text>

                <Group grow>
                  <Button variant="default" size="md" radius="md" disabled={busy} onClick={() => decide(false)}>
                    Deny
                  </Button>
                  <Button className="auth-submit" size="md" radius="md" loading={busy} onClick={() => decide(true)}>
                    Allow
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        </div>
      </div>
    </div>
  );
}
