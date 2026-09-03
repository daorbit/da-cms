import { api } from '@/lib/api';
import type {
  Workspace,
  WorkspaceMember,
  PendingInvite,
  WorkspaceSettings,
  SiteLink,
} from '@/types';

const base = (workspaceId: string) => `/workspaces/${workspaceId}`;

export interface MembersResponse {
  members: WorkspaceMember[];
  invites: PendingInvite[];
}

export type SettingsPayload = Partial<{
  /** Groups/tags are sent as plain name lists; the server derives slugs. */
  pageGroups: string[];
  pageTags: string[];
  siteLinks: Omit<SiteLink, 'order'>[];
}>;

export const workspaceService = {
  get(workspaceId: string) {
    return api.get<Workspace>(base(workspaceId));
  },

  update(workspaceId: string, payload: Partial<Pick<Workspace, 'name' | 'websiteUrl'>>) {
    return api.patch<Workspace>(base(workspaceId), payload);
  },

  /* --- members --- */

  members(workspaceId: string) {
    return api.get<MembersResponse>(`${base(workspaceId)}/members`);
  },

  invite(workspaceId: string, email: string, role: 'admin' | 'editor') {
    return api.post<{ invite: PendingInvite; acceptUrl: string }>(
      `${base(workspaceId)}/members/invites`,
      { email, role }
    );
  },

  resendInvite(workspaceId: string, inviteId: string) {
    return api.post<{ invite: PendingInvite; acceptUrl: string }>(
      `${base(workspaceId)}/members/invites/${inviteId}/resend`
    );
  },

  revokeInvite(workspaceId: string, inviteId: string) {
    return api.delete<void>(`${base(workspaceId)}/members/invites/${inviteId}`);
  },

  setMemberRole(workspaceId: string, membershipId: string, role: 'admin' | 'editor') {
    return api.patch<{ member: WorkspaceMember }>(
      `${base(workspaceId)}/members/${membershipId}`,
      { role }
    );
  },

  removeMember(workspaceId: string, membershipId: string) {
    return api.delete<void>(`${base(workspaceId)}/members/${membershipId}`);
  },

  /* --- settings --- */

  settings(workspaceId: string) {
    return api.get<WorkspaceSettings>(`${base(workspaceId)}/settings`);
  },

  updateSettings(workspaceId: string, payload: SettingsPayload) {
    return api.patch<WorkspaceSettings>(`${base(workspaceId)}/settings`, payload);
  },
};

/* --- invite accept (outside workspace scope) --- */

export interface InvitePreview {
  email: string;
  role: 'admin' | 'editor';
  workspace: { name: string; slug: string } | null;
}

export const inviteService = {
  preview(token: string) {
    return api.get<InvitePreview>(`/invites/${token}`);
  },
  accept(token: string) {
    return api.post<{ workspace: { slug: string; name: string } | null }>(
      `/invites/${token}/accept`
    );
  },
};
