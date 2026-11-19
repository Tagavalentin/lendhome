import { api } from '@/lib/api';
import type { Announcement, DiscussionReply } from '@plateforme/shared';

export type { Announcement, DiscussionReply };

export function fetchThread(resourceId: string) {
  return api.get<{ announcements: Announcement[]; replies: DiscussionReply[] }>(
    `/api/resources/${resourceId}/announcements`,
  );
}

export function createAnnouncement(resourceId: string, title: string, body: string) {
  return api.post<Announcement>(`/api/resources/${resourceId}/announcements`, { title, body });
}

export function createReply(announcementId: string, body: string) {
  return api.post<DiscussionReply>(`/api/announcements/${announcementId}/replies`, { body });
}
