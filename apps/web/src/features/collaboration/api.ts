import { api } from '@/lib/api';
import type { Announcement, DiscussionReply } from '@plateforme/shared';
import { useAuthStore } from '@/stores/auth';

export type { Announcement, DiscussionReply };

interface BackendAuthor {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

interface BackendAnnouncement {
  _id?: string;
  id?: string;
  resourceId?: unknown;
  authorId?: unknown;
  title?: string;
  content?: string;
  pinned?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

interface BackendMessage {
  _id?: string;
  id?: string;
  resourceId?: unknown;
  authorId?: unknown;
  content?: string;
  parentId?: unknown;
  isDeleted?: boolean;
  createdAt?: string;
}

const ROLE_TO_FRONT: Record<string, string> = {
  Utilisateur: 'user',
  Responsable: 'manager',
  Administrateur: 'admin',
};

function authorOf(v: unknown): { id: string; name: string; role: string } {
  if (v && typeof v === 'object') {
    const a = v as BackendAuthor;
    const name = [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email || 'Inconnu';
    return {
      id: String(a._id ?? a.id ?? ''),
      name,
      role: ROLE_TO_FRONT[a.role ?? ''] ?? 'user',
    };
  }
  return { id: String(v ?? ''), name: 'Inconnu', role: 'user' };
}

function strId(v: unknown): string {
  if (v && typeof v === 'object') {
    const o = v as { _id?: unknown; id?: unknown; toString?: () => string };
    return String(o._id ?? o.id ?? o.toString?.() ?? '');
  }
  return String(v ?? '');
}

function isPrivileged(): boolean {
  const role = useAuthStore.getState().user?.role;
  return role === 'manager' || role === 'admin';
}

function toAnnouncement(a: BackendAnnouncement, resourceId: string): Announcement {
  const author = authorOf(a.authorId);
  const privileged = ROLE_TO_FRONT[(a.authorId as BackendAuthor)?.role ?? ''] !== 'user';
  return {
    id: String(a._id ?? a.id),
    resourceId,
    authorId: author.id,
    authorName: author.name,
    authorRole: privileged ? 'manager' : 'user',
    isOfficial: Boolean(a.pinned) || privileged,
    title: a.title ?? 'Message',
    body: a.content ?? '',
    createdAt: a.createdAt ?? new Date().toISOString(),
  };
}

/**
 * Le backend sépare annonces (officielles, rôle manager/admin) et messages.
 * On fusionne : annonces officielles + messages racines comme cartes,
 * et les réponses (parentId) comme DiscussionReply.
 */
export async function fetchThread(resourceId: string) {
  const [annRes, msgRes] = await Promise.all([
    api.get<{ items: BackendAnnouncement[] }>(
      `/api/collaboration/resources/${resourceId}/announcements`,
    ),
    api.get<{ items: BackendMessage[] }>(`/api/collaboration/resources/${resourceId}/messages`, {
      limit: 100,
    }),
  ]);

  const announcements: Announcement[] = (annRes.items ?? []).map((a) =>
    toAnnouncement(a, resourceId),
  );

  const messages = (msgRes.items ?? []).filter((m) => !m.isDeleted);
  const replies: DiscussionReply[] = [];

  for (const m of messages) {
    const author = authorOf(m.authorId);
    if (m.parentId) {
      replies.push({
        id: String(m._id ?? m.id),
        announcementId: strId(m.parentId),
        authorId: author.id,
        authorName: author.name,
        body: m.content ?? '',
        createdAt: m.createdAt ?? new Date().toISOString(),
      });
    } else {
      // Message racine → carte de discussion
      announcements.push({
        id: String(m._id ?? m.id),
        resourceId,
        authorId: author.id,
        authorName: author.name,
        authorRole: author.role,
        isOfficial: false,
        title: (m.content ?? '').split('\n')[0]?.slice(0, 80) || 'Message',
        body: m.content ?? '',
        createdAt: m.createdAt ?? new Date().toISOString(),
      });
    }
  }

  announcements.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { announcements, replies };
}

export async function createAnnouncement(resourceId: string, title: string, body: string) {
  if (isPrivileged()) {
    const created = await api.post<BackendAnnouncement>(
      `/api/collaboration/resources/${resourceId}/announcements`,
      { title, content: body },
    );
    return toAnnouncement(created, resourceId);
  }
  // Utilisateur standard : message racine (le backend réserve les annonces
  // officielles aux responsables/admins).
  const created = await api.post<BackendMessage>(
    `/api/collaboration/resources/${resourceId}/messages`,
    { content: `${title}\n\n${body}` },
  );
  const author = authorOf(created.authorId);
  return {
    id: String(created._id ?? created.id),
    resourceId,
    authorId: author.id,
    authorName: author.name,
    authorRole: author.role,
    isOfficial: false,
    title,
    body,
    createdAt: created.createdAt ?? new Date().toISOString(),
  } satisfies Announcement;
}

export async function createReply(_resourceId: string, announcementId: string, body: string) {
  const created = await api.post<BackendMessage>(
    `/api/collaboration/resources/${_resourceId}/messages`,
    {
      content: body,
      parentId: announcementId,
    },
  );
  const author = authorOf(created.authorId);
  return {
    id: String(created._id ?? created.id),
    announcementId,
    authorId: author.id,
    authorName: author.name,
    body,
    createdAt: created.createdAt ?? new Date().toISOString(),
  } satisfies DiscussionReply;
}
