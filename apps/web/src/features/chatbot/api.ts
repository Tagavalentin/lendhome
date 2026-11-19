import { api } from '@/lib/api';
import type { ChatResponse } from '@plateforme/shared';
import type { ChatRequest } from '@plateforme/shared';

export function sendChatMessage(request: ChatRequest) {
  return api.post<ChatResponse>('/api/chatbot/message', request);
}
