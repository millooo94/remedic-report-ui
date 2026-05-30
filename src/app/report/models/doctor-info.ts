export interface DoctorInfo {
  id: string;
  nome: string;
  cognome: string;
  specialita?: string;
  ruolo?: string;
  displayName?: string;
  email?: string | null;
  assignedTypes?: Array<'emg' | 'psg'>;
  isRefertatore?: boolean;
  active?: boolean;
  visibleInStandard?: boolean;
}
