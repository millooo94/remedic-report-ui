import { ReportType } from '../types/report-type';

export type ReportDraftStatus =
  | 'bozza'
  | 'anamnesi_raccolta'
  | 'in_refertazione'
  | 'completato';

export interface ReportDraftSummaryData {
  paziente_nome: string | null;
  paziente_cognome: string | null;
  paziente_nome_completo: string | null;
  data_nascita: string | null;
  codice_fiscale: string | null;
  telefono: string | null;
  email: string | null;
  medico_refertatore: string | null;
  medico_refertatore_id: string | null;
  specializzazione: string | null;
  prestazione: string | null;
  data_esame: string | null;
}

export interface ReportDraftMeta {
  schemaVersion: number;
  currentStep: number;
  draftStatus: ReportDraftStatus;
}

export interface ReportDraftFormData {
  form: any;
  sections: any;
  meta: ReportDraftMeta;
}

export interface ReportDraftPayload {
  tipo_referto: ReportType;
  stato: ReportDraftStatus;
  summary: ReportDraftSummaryData;
  form_data: ReportDraftFormData;
}

export interface ReportDraftSummary extends ReportDraftSummaryData {
  id: string;
  tipo_referto: ReportType;
  stato: ReportDraftStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ReportDraftDetail {
  id: string;
  tipo_referto: ReportType;
  stato: ReportDraftStatus;
  summary: ReportDraftSummaryData;
  form_data: ReportDraftFormData;
  schema_version: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ReportDraftListResponse {
  items: ReportDraftSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface ReportDraftFilters {
  tipo_referto: '' | ReportType;
  stato: '' | ReportDraftStatus;
  q: string;
  limit: number;
  offset: number;
}
