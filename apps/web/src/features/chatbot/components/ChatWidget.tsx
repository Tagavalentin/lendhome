import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ActionProposal, ChatMessage } from '@plateforme/shared';
import { sendChatMessage } from '../api';
import { useCreateReservation } from '@/features/reservations/hooks';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// Widget chatbot : aucune action n'est exécutée sans confirmation explicite.
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<ActionProposal | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const createReservation = useCreateReservation();

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Le lien « Assistant » de la barre de navigation ouvre le widget.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('lendhome:open-chat', onOpen);
    return () => window.removeEventListener('lendhome:open-chat', onOpen);
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setError(null);
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setSending(true);
    try {
      const res = await sendChatMessage({
        message: text,
        history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      });
      setMessages((m) => [...m, res.message]);
      if (res.message.actionProposal) setPendingAction(res.message.actionProposal);
    } catch {
      setError('Le chatbot est indisponible. Réessayez dans un instant.');
    } finally {
      setSending(false);
    }
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    try {
      await createReservation.mutateAsync(pendingAction.payload);
      setConfirmed(`✅ Réservation « ${pendingAction.payload.title} » créée avec succès.`);
      setPendingAction(null);
    } catch {
      setError("La réservation n'a pas pu être créée (conflit possible).");
    }
  };

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Fermer l’assistant' : 'Ouvrir l’assistant'}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-2xl text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-300"
      >
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Assistant conversationnel"
          className="fixed bottom-24 right-4 z-50 flex h-[32rem] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl sm:right-5"
        >
          <div className="flex items-center justify-between border-b border-gray-100 bg-brand-600 px-4 py-3 text-white">
            <div>
              <p className="font-semibold">Assistant LENDHOME</p>
              <p className="text-xs text-brand-100">
                Posez vos questions sur les salles et le matériel
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="rounded p-1 hover:bg-white/10"
            >
              ✕
            </button>
          </div>

          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4"
            aria-live="polite"
          >
            {messages.length === 0 && (
              <p className="text-center text-sm text-gray-500">
                Bonjour ! Je peux vous aider à trouver une salle ou du matériel.
                <br />
                Essayez « une salle de réunion » ou « imprimante 3D ».
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    m.role === 'user'
                      ? 'bg-brand-600 text-white'
                      : 'bg-white text-gray-800 shadow-sm',
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>

                  {m.resourceCards && m.resourceCards.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {m.resourceCards.map((c) => (
                        <Link
                          key={c.resourceId}
                          to={`/ressources/${c.resourceId}`}
                          className="block rounded-md border border-gray-200 bg-white p-2 text-xs text-gray-700 hover:border-brand-400 hover:bg-brand-50"
                        >
                          <span className="font-medium text-brand-700">{c.name}</span>
                          <span className="ml-1 text-gray-400">
                            ({c.type === 'room' ? 'Salle' : 'Équipement'})
                          </span>
                          <br />
                          {c.locationName}
                          {c.capacity ? ` · ${c.capacity} places` : ''}
                          {c.inventoryNumber ? ` · ${c.inventoryNumber}` : ''}
                        </Link>
                      ))}
                    </div>
                  )}

                  {m.slotSuggestions && m.slotSuggestions.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs">
                      {m.slotSuggestions.map((s, i) => (
                        <li key={i} className="rounded bg-gray-50 px-2 py-1">
                          🕐 {new Date(s.start).toLocaleString('fr-FR')} →{' '}
                          {new Date(s.end).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <p className="text-xs text-gray-400" role="status">
                L'assistant écrit…
              </p>
            )}

            {pendingAction && (
              <div className="rounded-lg border border-brand-300 bg-brand-50 p-3 text-sm">
                <p className="font-medium text-gray-900">Action proposée</p>
                <p className="mt-1 text-gray-700">{pendingAction.summary}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Rien ne sera créé sans votre confirmation.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={confirmAction} loading={createReservation.isPending}>
                    Confirmer
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setPendingAction(null)}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {confirmed && (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
                {confirmed}
              </div>
            )}
            {error && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>

          <form
            className="flex gap-2 border-t border-gray-100 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écrivez votre message…"
              aria-label="Message à l'assistant"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <Button type="submit" size="sm" loading={sending} disabled={!input.trim()}>
              Envoyer
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
