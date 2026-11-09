import { api } from '@/lib/api';

export interface ConsentRequest {
  clientName: string;
  redirectHost: string;
  scope: string;
}

export const oauthService = {
  describe(ticket: string) {
    return api.get<ConsentRequest>(`/oauth/consent?ticket=${encodeURIComponent(ticket)}`);
  },
  decide(ticket: string, approve: boolean) {
    return api.post<{ redirectUrl: string }>('/oauth/consent', { ticket, approve });
  },
};
