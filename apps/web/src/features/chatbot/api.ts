import { api } from '@/lib/api';
import type { ChatResponse } from '@plateforme/shared';

const nid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

interface BackendChatReply {
  reply: string;
  intent?: string;
  resources?: { id: string; name: string; type: string; capacity?: number }[];
  suggestedAction?: {
    type: string;
    resourceId: string;
    date?: string;
    requiresConfirmation: boolean;
  };
}

export async function sendChatMessage(request: {
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}) {
  const res = await api.post<BackendChatReply>('/api/chatbot/message', {
    message: request.message,
  });

  const resourceCards = res.resources?.map((r) => ({
    resourceId: r.id,
    name: r.name,
    type: (r.type === 'Equipment' ? 'equipment' : 'room') as 'room' | 'equipment',
    capacity: r.capacity,
  }));

  // Le backend propose seulement d'ouvrir le formulaire : on construit
  // une proposition de réservation confirmable comme dans le mock.
  let actionProposal: ChatResponse['message']['actionProposal'];
  if (res.suggestedAction?.resourceId) {
    const resource = res.resources?.find((r) => r.id === res.suggestedAction!.resourceId);
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 2 * 3600_000);
    const payload = {
      resourceId: res.suggestedAction.resourceId,
      title: `Réservation ${resource?.name ?? 'ressource'}`,
      purpose: request.message.slice(0, 200),
      start: start.toISOString(),
      end: end.toISOString(),
      participants: 1,
    };
    actionProposal = {
      kind: 'create_reservation',
      label: 'Réserver ce créneau',
      payload,
      summary: `${resource?.name ?? 'Ressource'} — ${start.toLocaleString('fr-FR')} → ${end.toLocaleTimeString('fr-FR')}`,
    };
  }

  const response: ChatResponse = {
    message: {
      id: nid('chat'),
      role: 'assistant',
      content: res.reply,
      createdAt: new Date().toISOString(),
      ...(resourceCards?.length ? { resourceCards } : {}),
      ...(actionProposal ? { actionProposal } : {}),
    },
  };
  return response;
}
