import { WorkspaceModel } from '../models/workspace.model.js';
import { MembershipModel } from '../models/membership.model.js';
import { notFound } from '../lib/service-error.js';

interface Term {
  name: string;
  color?: string;
}

/* Loose shapes — the callers pass Mongoose documents, whose subdocument types
 * don't line up with plain interfaces. */
/* eslint-disable @typescript-eslint/no-explicit-any */

export function settingsResponse(w: any) {
  const cfg = w?.settings?.configuration ?? {};
  const term = (t: Term) => ({
    name: t.name,
    color: t.color ?? '',
  });
  return {
    configuration: {
      groups: ((cfg.groups ?? []) as Term[]).map(term),
      tags: ((cfg.tags ?? []) as Term[]).map(term),
    },
    siteLinks: ((w?.settings?.siteLinks ?? []) as { label: string; url: string; order: number }[])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(({ label, url, order }) => ({ label, url, order })),
  };
}

export function toResponse(workspace: any, role?: string) {
  return {
    id: String(workspace._id),
    name: workspace.name,
    slug: workspace.slug,
    websiteUrl: workspace.websiteUrl ?? '',
    role: role ?? null,
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/** The user's active membership of a workspace, or null if they have none. */
export function findActiveMembership(userId: string | undefined, workspaceId: string) {
  return MembershipModel.findOne({ userId, workspaceId, status: 'active' });
}

/** Every workspace the user is an active member of, with their role in each. */
export async function workspacesForUser(userId: string | undefined) {
  const memberships = await MembershipModel.find({ userId, status: 'active' });
  const workspaces = await WorkspaceModel.find({ _id: { $in: memberships.map((m) => m.workspaceId) } });
  // The caller's role travels with each workspace so the UI can hide admin-only
  // controls without a follow-up request.
  const roleByWorkspace = new Map(memberships.map((m) => [String(m.workspaceId), m.role]));
  return workspaces.map((w) => toResponse(w, roleByWorkspace.get(String(w._id))));
}

/** A workspace with its settings, for a caller already known to be a member. */
export async function workspaceWithSettings(workspaceId: string, role?: string) {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) throw notFound('Workspace not found');
  return { ...toResponse(workspace, role), settings: settingsResponse(workspace) };
}
