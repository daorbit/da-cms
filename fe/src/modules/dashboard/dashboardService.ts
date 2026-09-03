import { api } from '@/lib/api';
import type { DashboardStats } from '@/types';

export const dashboardService = {
  stats(workspaceId: string) {
    return api.get<DashboardStats>(`/workspaces/${workspaceId}/dashboard/stats`);
  },
};
