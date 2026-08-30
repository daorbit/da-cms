import { useParams } from 'react-router-dom';
import { useAuth } from './useAuth';

/** Resolves the `:workspaceSlug` route param to the matching workspace. */
export function useWorkspace() {
  const { workspaceSlug } = useParams();
  const { workspaces } = useAuth();
  return workspaces.find((w) => w.slug === workspaceSlug) ?? null;
}
