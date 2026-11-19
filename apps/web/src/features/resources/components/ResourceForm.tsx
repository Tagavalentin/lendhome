import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { resourceCreateSchema, type Resource, type ResourceType } from '@plateforme/shared';
import { useLocations } from '@/features/locations/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const formSchema = resourceCreateSchema.extend({
  capacity: z.number().int().positive().optional(),
  inventoryNumber: z.string().optional(),
  equipmentState: z.enum(['available', 'in_use', 'maintenance', 'retired']).default('available'),
  equipmentKind: z.string().default('other'),
  kind: z.string().default('meeting'),
});
type FormValues = z.infer<typeof formSchema>;

export function ResourceForm({
  open,
  onClose,
  initial,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Resource | null;
  onSubmit: (values: FormValues) => Promise<void> | void;
  loading?: boolean;
}) {
  const { data: locations } = useLocations();
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: (initial?.type ?? 'room') as ResourceType,
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      locationId: initial?.locationId ?? '',
      tags: initial?.tags ?? [],
      photos: initial?.photos ?? [],
      rules: initial?.rules ?? {},
      capacity: initial?.room?.capacity,
      inventoryNumber: initial?.equipment?.inventoryNumber,
      equipmentState: initial?.equipment?.state ?? 'available',
      equipmentKind: initial?.equipment?.kind ?? 'other',
      kind: initial?.room?.kind ?? 'meeting',
    },
  });

  useEffect(() => {
    if (open) {
      setPhotos(initial?.photos ?? []);
      reset({
        type: (initial?.type ?? 'room') as ResourceType,
        name: initial?.name ?? '',
        description: initial?.description ?? '',
        locationId: initial?.locationId ?? '',
        tags: initial?.tags ?? [],
        photos: initial?.photos ?? [],
        rules: initial?.rules ?? {},
        capacity: initial?.room?.capacity,
        inventoryNumber: initial?.equipment?.inventoryNumber,
        equipmentState: initial?.equipment?.state ?? 'available',
        equipmentKind: initial?.equipment?.kind ?? 'other',
        kind: initial?.room?.kind ?? 'meeting',
      });
    }
  }, [open, initial, reset]);

  const type = watch('type');

  const onFiles = (files: FileList | null) => {
    setPhotoError(null);
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setPhotoError(`Format non supporté : ${file.name} (JPEG, PNG, WebP)`);
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setPhotoError(`Fichier trop volumineux : ${file.name} (max 2 Mo)`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((p) => [...p, String(reader.result)]);
      };
      reader.readAsDataURL(file);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = handleSubmit(async (values) => {
    const payload: Record<string, unknown> = {
      type: values.type,
      name: values.name,
      description: values.description,
      locationId: values.locationId,
      tags: values.tags ?? [],
      photos,
      rules: values.rules ?? {},
      isActive: true,
    };
    if (values.type === 'room') {
      payload.room = {
        capacity: values.capacity ?? 1,
        kind: values.kind ?? 'meeting',
      };
      delete payload.equipment;
    } else {
      payload.equipment = {
        inventoryNumber: values.inventoryNumber ?? '',
        kind: values.equipmentKind ?? 'other',
        state: values.equipmentState ?? 'available',
      };
      delete payload.room;
    }
    try {
      await onSubmit(payload as unknown as FormValues);
    } catch {
      // Les mutations affichent déjà un toast d'erreur.
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Modifier la ressource' : 'Nouvelle ressource'}
      wide
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" form="resource-form" loading={loading}>
            {initial ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      }
    >
      <form id="resource-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Nom" htmlFor="r-name" error={errors.name?.message} required>
          <Input id="r-name" {...register('name')} />
        </Field>
        <Field label="Type" htmlFor="r-type" required>
          <Select id="r-type" {...register('type')}>
            <option value="room">Salle</option>
            <option value="equipment">Équipement</option>
          </Select>
        </Field>
        <Field label="Lieu" htmlFor="r-location" error={errors.locationId?.message} required>
          <Select id="r-location" {...register('locationId')}>
            <option value="">— Choisir —</option>
            {(locations?.items ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor="r-desc">
          <Textarea id="r-desc" {...register('description')} />
        </Field>
        {type === 'room' ? (
          <>
            <Field
              label="Capacité (places)"
              htmlFor="r-cap"
              error={errors.capacity?.message}
              required
            >
              <Input
                id="r-cap"
                type="number"
                min={1}
                {...register('capacity', { valueAsNumber: true })}
              />
            </Field>
            <Field label="Type de salle" htmlFor="r-kind">
              <Select id="r-kind" {...register('kind')}>
                <option value="meeting">Salle de réunion</option>
                <option value="workshop">Atelier</option>
                <option value="studio">Studio</option>
                <option value="lab">Laboratoire</option>
                <option value="open_space">Espace ouvert</option>
              </Select>
            </Field>
          </>
        ) : (
          <>
            <Field
              label="N° d'inventaire"
              htmlFor="r-inv"
              error={errors.inventoryNumber?.message}
              required
            >
              <Input id="r-inv" {...register('inventoryNumber')} placeholder="EQ-XXX-000" />
            </Field>
            <Field label="Type d'équipement" htmlFor="r-ekind">
              <Select id="r-ekind" {...register('equipmentKind')}>
                <option value="3d_printer">Imprimante 3D</option>
                <option value="laser_cutter">Découpeuse laser</option>
                <option value="cnc">Fraiseuse CNC</option>
                <option value="electronics">Électronique</option>
                <option value="tools">Outillage</option>
                <option value="audio_visual">Audio/vidéo</option>
                <option value="other">Autre</option>
              </Select>
            </Field>
            <Field label="État" htmlFor="r-estate">
              <Select id="r-estate" {...register('equipmentState')}>
                <option value="available">Disponible</option>
                <option value="in_use">En utilisation</option>
                <option value="maintenance">En maintenance</option>
                <option value="retired">Retiré</option>
              </Select>
            </Field>
          </>
        )}

        <div className="sm:col-span-2">
          <span className="text-sm font-medium text-gray-700">Photos</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div
                key={i}
                className="relative h-20 w-28 overflow-hidden rounded-md border border-gray-200"
              >
                <img src={p} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label="Retirer la photo"
                  onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-20 w-28 items-center justify-center rounded-md border-2 border-dashed border-gray-300 text-xs text-gray-500 hover:border-brand-400 hover:text-brand-600"
            >
              + Ajouter
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </div>
          {photoError && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {photoError}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">JPEG, PNG, WebP — 2 Mo max par image.</p>
        </div>
      </form>
    </Modal>
  );
}
