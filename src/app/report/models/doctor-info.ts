export interface DoctorInfo {
  id: string;
  nome: string;
  cognome: string;
  specialita?: string;
  ruolo?: string;
  tipo?: 'medico' | 'tecnico';
  displayName?: string;
}
