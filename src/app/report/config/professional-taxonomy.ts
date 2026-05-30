export const PROFESSIONAL_SPECIALIZATIONS = [
  'Neurologia',
  'Pneumologia',
  'Allergologia',
  'Medicina Interna',
  'Cardiologia',
  'Dermatologia',
  'Endocrinologia',
  'Ginecologia',
  'Urologia',
  'Reumatologia',
  'Chirurgia Vascolare',
  'Dietologia',
  'Dietistica',
  'Medicina Estetica',
  'Psicoterapia',
  'Ostetricia',
  'Tecnico di Neurofisiopatologia',
  'Medicina Generale',
  'Senologia',
  'Biologia nutrizionale',
  'Chirurgia Plastica',
  'Chirurgia maxillo-facciale',
  'Altro',
] as const;

export type ProfessionalSpecialization =
  (typeof PROFESSIONAL_SPECIALIZATIONS)[number];

export function isEmgAssignableSpecialization(
  specializzazione?: string | null,
): boolean {
  return normalizeSpecialization(specializzazione) === 'Neurologia';
}

export function isPsgAssignableSpecialization(
  specializzazione?: string | null,
): boolean {
  const normalized = normalizeSpecialization(specializzazione);
  return (
    normalized === 'Neurologia' ||
    normalized === 'Pneumologia' ||
    normalized === 'Allergologia'
  );
}

export function isRefertatoreCompatibleSpecialization(
  specializzazione?: string | null,
): boolean {
  return (
    isEmgAssignableSpecialization(specializzazione) ||
    isPsgAssignableSpecialization(specializzazione)
  );
}

export function normalizeSpecialization(
  specializzazione?: string | null,
): ProfessionalSpecialization | null {
  const value = String(specializzazione || '').trim().toLowerCase();
  if (!value) {
    return null;
  }

  return (
    PROFESSIONAL_SPECIALIZATIONS.find(
      (item) => item.toLowerCase() === value,
    ) || null
  );
}
