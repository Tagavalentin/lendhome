import { api } from '@/lib/api';
import type { Loan, LoanCreateInput, LoanReturnInput } from '@plateforme/shared';
import { toFrontendLoan } from '@/lib/backend';
import type { BackendLoan } from '@/lib/backend';

const STATUS_TO_BACK: Record<string, string> = {
  active: 'ACTIVE',
  returned: 'RETURNED',
  overdue: 'OVERDUE',
};

function toBackendCondition(condition: string | undefined): string {
  const c = (condition ?? '').toLowerCase();
  if (c.includes('perdu') || c.includes('lost')) return 'LOST';
  if (c.includes('endommag') || c.includes('cass') || c.includes('rayure') || c.includes('damage'))
    return 'DAMAGED';
  return 'GOOD';
}

export async function fetchLoans(params: { resourceId?: string; status?: string; mine?: boolean }) {
  const query: Record<string, string | number | undefined> = {};
  if (params.status && STATUS_TO_BACK[params.status]) query.status = STATUS_TO_BACK[params.status];
  const res = await api.get<{ items: BackendLoan[] }>('/api/loans', query);
  let items = res.items.map(toFrontendLoan);
  if (params.resourceId) items = items.filter((l) => l.resourceId === params.resourceId);
  return { items };
}

export async function createLoan(input: LoanCreateInput) {
  const created = await api.post<BackendLoan>('/api/loans', {
    equipmentId: input.resourceId,
    dueAt: new Date(`${input.plannedEnd}T23:59:59`).toISOString(),
    conditionAtLoan: 'GOOD',
    notes: input.notes,
  });
  return toFrontendLoan(created);
}

export async function returnLoan(id: string, input: LoanReturnInput) {
  const updated = await api.post<BackendLoan>(`/api/loans/${id}/return`, {
    conditionAtReturn: toBackendCondition(input.conditionIn),
    notes: input.notes,
  });
  return toFrontendLoan(updated);
}

export async function checkoutLoan(id: string): Promise<Loan> {
  // Le backend crée les prêts directement actifs : la remise de matériel
  // n'est pas un état distinct. On renvoie le prêt inchangé.
  const res = await api.get<{ items: BackendLoan[] }>('/api/loans', { limit: 100 });
  const found = res.items.find((l) => String(l._id ?? l.id) === id);
  if (!found) throw new Error('Prêt introuvable');
  return toFrontendLoan(found);
}
