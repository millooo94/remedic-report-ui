export interface DoctorInfo {
  id: string;
  nome: string;
  cognome: string;
  specialita?: string;
  ruolo?: string;
  tipo?:
    | 'medico'
    | 'dietista'
    | 'ostetrica'
    | 'psicoterapeuta'
    | 'tnfp'
    | 'altro'
    | 'tecnico'
    | 'professionista_sanitario'
    | 'professionista sanitario';
  displayName?: string;
  email?: string | null;
  assignedTypes?: Array<'emg' | 'psg'>;
  isRefertatore?: boolean;
  active?: boolean;
  visibleInStandard?: boolean;
}
