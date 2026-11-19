import { api } from '@/lib/api';
import type { Loan, LoanCreateInput, LoanReturnInput } from '@plateforme/shared';

export function fetchLoans(params: { resourceId?: string; status?: string; mine?: boolean }) {
  return api.get<{ items: Loan[] }>('/api/loans', params);
}

export function createLoan(input: LoanCreateInput) {
  return api.post<Loan>('/api/loans', input);
}

export function returnLoan(id: string, input: LoanReturnInput) {
  return api.post<Loan>(`/api/loans/${id}/return`, input);
}

export function checkoutLoan(id: string) {
  return api.post<Loan>(`/api/loans/${id}/checkout`);
}
