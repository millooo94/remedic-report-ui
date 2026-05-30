import { ReportType } from '../types/report-type';

export type ReportDraftStatus =
  | 'bozza'
  | 'anamnesi_raccolta'
  | 'in_refertazione'
  | 'in_attesa_refertatore'
  | 'in_refertazione_refertatore'
  | 'pronto_per_firma'
  | 'firmato_caricato'
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
  assigned_refertatore_id?: string | null;
  assigned_refertatore_email?: string | null;
  assigned_refertatore_name?: string | null;
  assigned_refertatore_specializzazione?: string | null;
  specializzazione: string | null;
  prestazione: string | null;
  data_esame: string | null;
}

export interface ReportDraftMeta {
  schemaVersion: number;
  currentStep: number;
  draftStatus: ReportDraftStatus;
  sentToRefertatore?: boolean;
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
  attachments?: DraftAttachmentMetadata[];
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
  scope?: '' | 'active' | 'archive';
  q: string;
  limit: number;
  offset: number;
}

export type DraftAttachmentKind =
  | 'emg_tracciato'
  | 'emg_firma_tnfp'
  | 'emg_pdf_firmato'
  | 'psg_report_strumentale'
  | 'psg_pdf_firmato';

export interface DraftAttachmentMetadata {
  id: string;
  draft_id: string;
  kind: DraftAttachmentKind;
  file_name: string;
  original_name: string | null;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  drive_file_id?: string | null;
  drive_web_view_link?: string | null;
  drive_folder_id?: string | null;
  created_at: string;
}

export interface DraftAttachmentListResponse {
  items: DraftAttachmentMetadata[];
}

export interface DraftAttachmentUploadPayload {
  kind: DraftAttachmentKind;
  fileName: string;
  mimeType: string;
  base64: string;
}

export interface SignedDraftPdfUploadPayload {
  tipo_referto: Extract<ReportType, 'emg' | 'psg'>;
  fileName: string;
  mimeType: 'application/pdf';
  base64: string;
}

export interface SignedDraftPdfUploadResponse {
  draft: {
    id: string;
    stato: ReportDraftStatus;
    updated_at: string;
    completed_at: string | null;
  };
  attachment: DraftAttachmentMetadata;
  drive: {
    fileName: string;
    specializzazione: string;
    medico: string;
    pazienteFolder: string;
    driveFileId?: string | null;
    driveWebViewLink?: string | null;
  } | null;
}

export interface AuthUser {
  id: string;
  role: 'admin' | 'refertatore';
  email: string;
  displayName: string;
  specializzazione: string | null;
  active: boolean;
  mustChangePassword: boolean;
  assignedTypes: Array<'emg' | 'psg'>;
}

export interface AuthLoginResponse {
  user: AuthUser;
  csrfToken: string;
  expiresAt: string;
}

export interface AuthMeResponse {
  user: AuthUser;
}

export interface CsrfResponse {
  csrfToken: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface ProfessionalRecord {
  user: {
    id: string;
  };
}

export interface ProfessionalItem {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  specializzazione: string | null;
  role_label: string | null;
  professional_type:
    | 'medico'
    | 'dietista'
    | 'ostetrica'
    | 'psicoterapeuta'
    | 'tnfp'
    | 'altro'
    | 'tecnico'
    | 'professionista_sanitario'
    | 'professionista sanitario';
  visible_in_standard: boolean;
  is_refertatore: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalsResponse {
  items: ProfessionalItem[];
}

export interface RefertatoreItem {
  id: string;
  email: string;
  display_name: string;
  specializzazione: string | null;
  assignedTypes: Array<'emg' | 'psg'>;
}

export interface RefertatoriResponse {
  items: RefertatoreItem[];
}

export interface RefertatoreEmgDraftSummary {
  id: string;
  stato: Extract<
    ReportDraftStatus,
    'in_attesa_refertatore' | 'in_refertazione_refertatore' | 'pronto_per_firma'
  >;
  paziente_nome_completo: string | null;
  data_nascita: string | null;
  data_esame: string | null;
  medico_refertatore: string | null;
  tecnico_esecutore: string | null;
  updated_at: string;
  attachment_count: number;
}

export interface RefertatoreEmgDraftListResponse {
  items: RefertatoreEmgDraftSummary[];
}

export interface AdminUserItem {
  id: string;
  role: 'admin' | 'refertatore';
  professional_id?: string | null;
  professional_display_name?: string | null;
  email: string;
  display_name: string;
  specializzazione: string | null;
  active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  assignedTypes: Array<'emg' | 'psg'>;
}

export interface AdminUsersResponse {
  items: AdminUserItem[];
}

export interface AuditLogItem {
  id: string;
  user_id: string | null;
  role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
}

export interface AuditLogsResponse {
  items: AuditLogItem[];
  limit: number;
  offset: number;
}

export interface DraftEmailDeliveryItem {
  id: string;
  draft_id: string;
  sent_by_user_id: string;
  recipient_email_masked: string;
  recipient_email_hash: string;
  subject: string;
  status: 'sent' | 'failed';
  error_message: string | null;
  created_at: string;
}

export interface DraftEmailDeliveriesResponse {
  items: DraftEmailDeliveryItem[];
}

export interface SendDraftToPatientPayload {
  to: string;
  subject: string;
  body: string;
}

export interface SendDraftToPatientResponse {
  ok: boolean;
  message: string;
}
