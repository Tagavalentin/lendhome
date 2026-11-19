import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loanCreateSchema, type LoanCreateInput } from '@plateforme/shared';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { useCreateLoan } from '../hooks';

interface Props {
  open: boolean;
  onClose: () => void;
  resourceId: string;
  resourceName: string;
}

export function LoanRequestForm({ open, onClose, resourceId, resourceName }: Props) {
  const mutation = useCreateLoan();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoanCreateInput>({
    resolver: zodResolver(loanCreateSchema),
    defaultValues: { resourceId, plannedStart: '', plannedEnd: '', notes: '' },
  });

  useEffect(() => {
    if (open) reset({ resourceId, plannedStart: '', plannedEnd: '', notes: '' });
  }, [open, resourceId, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Demande d'emprunt"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Annuler
          </Button>
          <Button type="submit" form="loan-form" loading={mutation.isPending}>
            Envoyer la demande
          </Button>
        </div>
      }
    >
      <form
        id="loan-form"
        className="space-y-4"
        noValidate
        onSubmit={handleSubmit(async (values) => {
          await mutation.mutateAsync(values);
          onClose();
        })}
      >
        <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
          <span className="font-medium">Équipement :</span> {resourceName}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Sortie prévue"
            htmlFor="loan-start"
            error={errors.plannedStart?.message}
            required
          >
            <Input id="loan-start" type="date" {...register('plannedStart')} />
          </Field>
          <Field
            label="Retour prévu"
            htmlFor="loan-end"
            error={errors.plannedEnd?.message}
            required
          >
            <Input id="loan-end" type="date" {...register('plannedEnd')} />
          </Field>
        </div>
        <Field label="Notes" htmlFor="loan-notes" error={errors.notes?.message}>
          <Textarea
            id="loan-notes"
            placeholder="Précisions utiles (projet, usage…)"
            {...register('notes')}
          />
        </Field>
      </form>
    </Modal>
  );
}
