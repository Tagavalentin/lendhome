import { useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useCreateAnnouncement, useCreateReply, useResourceThread } from '../hooks';
import type { Announcement } from '../api';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Badge, EmptyState, Spinner } from '@/components/ui/Feedback';
import { formatDateTime, USER_ROLE_LABELS } from '@/lib/utils';

export function CollaborationSection({ resourceId }: { resourceId: string }) {
  const { data, isLoading } = useResourceThread(resourceId);
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const createAnn = useCreateAnnouncement(resourceId);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const announcements = data?.announcements ?? [];
  const replies = data?.replies ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    createAnn.mutate(
      { title: title.trim(), body: body.trim() },
      {
        onSuccess: () => {
          setTitle('');
          setBody('');
          setShowForm(false);
        },
      },
    );
  };

  return (
    <section aria-labelledby="collab-heading" className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="collab-heading" className="text-lg font-semibold text-gray-900">
          Annonces & échanges
        </h2>
        <Button size="sm" variant="secondary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Annuler' : 'Publier un message'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="mb-4 space-y-3 rounded-lg border border-gray-200 bg-white p-4"
        >
          <Field label="Titre" htmlFor="ann-title" required>
            <Input
              id="ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isManager ? 'Annonce officielle…' : 'Sujet de discussion…'}
            />
          </Field>
          <Field label="Message" htmlFor="ann-body" required>
            <Textarea
              id="ann-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Votre message…"
            />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" loading={createAnn.isPending}>
              Publier
            </Button>
            {isManager && (
              <span className="text-xs text-gray-500">
                En tant que responsable, votre message est marqué officiel.
              </span>
            )}
          </div>
        </form>
      )}

      {isLoading ? (
        <Spinner label="Chargement du fil…" />
      ) : announcements.length === 0 ? (
        <EmptyState
          title="Aucun message"
          message="Soyez le premier à publier une annonce ou une question."
        />
      ) : (
        <ul className="space-y-3">
          {announcements.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              replies={replies.filter((r) => r.announcementId === a.id)}
              resourceId={resourceId}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function AnnouncementCard({
  announcement,
  replies,
  resourceId,
}: {
  announcement: Announcement;
  replies: { id: string; authorName: string; body: string; createdAt: string }[];
  resourceId: string;
}) {
  const createReply = useCreateReply(resourceId);
  const [reply, setReply] = useState('');
  const [showReply, setShowReply] = useState(false);

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        {announcement.isOfficial && <Badge tone="blue">Officiel</Badge>}
        <span className="font-medium text-gray-900">{announcement.title}</span>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{announcement.body}</p>
      <p className="mt-2 text-xs text-gray-400">
        {announcement.authorName} ·{' '}
        {USER_ROLE_LABELS[announcement.authorRole] ?? announcement.authorRole} ·{' '}
        {formatDateTime(announcement.createdAt)}
      </p>

      {replies.length > 0 && (
        <ul className="mt-3 space-y-2 border-l-2 border-gray-100 pl-4">
          {replies.map((r) => (
            <li key={r.id} className="text-sm">
              <span className="font-medium text-gray-700">{r.authorName}</span>{' '}
              <span className="text-gray-500">{formatDateTime(r.createdAt)}</span>
              <p className="text-gray-700">{r.body}</p>
            </li>
          ))}
        </ul>
      )}

      {showReply ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reply.trim()) return;
            createReply.mutate(
              { announcementId: announcement.id, body: reply.trim() },
              {
                onSuccess: () => {
                  setReply('');
                  setShowReply(false);
                },
              },
            );
          }}
        >
          <Input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Votre réponse…"
            aria-label="Votre réponse"
          />
          <Button type="submit" size="sm" loading={createReply.isPending}>
            Répondre
          </Button>
        </form>
      ) : (
        <button
          onClick={() => setShowReply(true)}
          className="mt-2 text-sm text-brand-600 hover:underline"
        >
          Répondre
        </button>
      )}
    </li>
  );
}
