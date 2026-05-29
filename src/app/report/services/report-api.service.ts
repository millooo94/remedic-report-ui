import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminUsersResponse,
  AuditLogsResponse,
  AuthLoginResponse,
  AuthMeResponse,
  CsrfResponse,
  DraftAttachmentListResponse,
  DraftAttachmentMetadata,
  DraftAttachmentUploadPayload,
  ForgotPasswordResponse,
  ProfessionalsResponse,
  RefertatoriResponse,
  ReportDraftDetail,
  ReportDraftFilters,
  ReportDraftListResponse,
  ReportDraftPayload,
  ReportDraftStatus,
  ResetPasswordResponse,
  SignedDraftPdfUploadPayload,
  SignedDraftPdfUploadResponse,
} from '../models/report-draft';
import { ReportPdfRequest } from '../models/report-pdf-request';

@Injectable({
  providedIn: 'root',
})
export class ReportApiService {
  private csrfToken = '';

  constructor(private http: HttpClient) {}

  private buildPublicHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-api-key': environment.API.PUBLIC_PDF_API_KEY,
    });
  }

  private buildAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    if (this.csrfToken) {
      headers = headers.set('x-csrf-token', this.csrfToken);
    }

    return headers;
  }

  setCsrfToken(token: string | null | undefined): void {
    this.csrfToken = token?.trim() || '';
  }

  clearAuthState(): void {
    this.csrfToken = '';
  }

  generatePdf(payload: ReportPdfRequest): Observable<string> {
    return this.http.post<string>(`${environment.API.BASE_URL}/pdf`, payload, {
      headers: this.buildPublicHeaders(),
      responseType: 'text' as 'json',
    });
  }

  previewPdf(payload: ReportPdfRequest): Observable<Blob> {
    return this.http.post(`${environment.API.BASE_URL}/pdf/preview`, payload, {
      headers: this.buildPublicHeaders(),
      responseType: 'blob',
    });
  }

  login(email: string, password: string): Observable<AuthLoginResponse> {
    return this.http
      .post<AuthLoginResponse>(
        `${environment.API.BASE_URL}/auth/login`,
        { email, password },
        {
          headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
          withCredentials: true,
        },
      )
      .pipe(tap((response) => this.setCsrfToken(response.csrfToken)));
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(
        `${environment.API.BASE_URL}/auth/logout`,
        {},
        {
          headers: this.buildAuthHeaders(),
          withCredentials: true,
        },
      )
      .pipe(tap(() => this.clearAuthState()));
  }

  me(): Observable<AuthMeResponse> {
    return this.http.get<AuthMeResponse>(`${environment.API.BASE_URL}/auth/me`, {
      withCredentials: true,
    });
  }

  getCsrf(): Observable<CsrfResponse> {
    return this.http
      .get<CsrfResponse>(`${environment.API.BASE_URL}/auth/csrf`, {
        withCredentials: true,
      })
      .pipe(tap((response) => this.setCsrfToken(response.csrfToken)));
  }

  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(
      `${environment.API.BASE_URL}/auth/forgot-password`,
      { email },
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
        withCredentials: true,
      },
    );
  }

  resetPassword(token: string, newPassword: string): Observable<ResetPasswordResponse> {
    return this.http.post<ResetPasswordResponse>(
      `${environment.API.BASE_URL}/auth/reset-password`,
      { token, newPassword },
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
        withCredentials: true,
      },
    );
  }

  listProfessionals(): Observable<ProfessionalsResponse> {
    return this.http.get<ProfessionalsResponse>(
      `${environment.API.BASE_URL}/professionals`,
      {
        headers: this.buildPublicHeaders(),
      },
    );
  }

  listRefertatori(tipoReferto: 'emg' | 'psg'): Observable<RefertatoriResponse> {
    return this.http.get<RefertatoriResponse>(
      `${environment.API.BASE_URL}/refertatori`,
      {
        headers: this.buildPublicHeaders(),
        params: new HttpParams().set('tipo_referto', tipoReferto),
      },
    );
  }

  createDraft(payload: ReportDraftPayload): Observable<ReportDraftDetail> {
    return this.http.post<ReportDraftDetail>(
      `${environment.API.BASE_URL}/drafts`,
      payload,
      { headers: this.buildPublicHeaders() },
    );
  }

  listDrafts(filters: ReportDraftFilters): Observable<ReportDraftListResponse> {
    let params = new HttpParams()
      .set('limit', String(filters.limit))
      .set('offset', String(filters.offset));

    if (filters.tipo_referto) params = params.set('tipo_referto', filters.tipo_referto);
    if (filters.stato) params = params.set('stato', filters.stato);
    if (filters.scope) params = params.set('scope', filters.scope);
    if (filters.q.trim()) params = params.set('q', filters.q.trim());

    return this.http.get<ReportDraftListResponse>(
      `${environment.API.BASE_URL}/drafts`,
      {
        headers: this.buildPublicHeaders(),
        params,
      },
    );
  }

  getDraft(id: string): Observable<ReportDraftDetail> {
    return this.http.get<ReportDraftDetail>(
      `${environment.API.BASE_URL}/drafts/${id}`,
      { headers: this.buildPublicHeaders() },
    );
  }

  updateDraft(id: string, payload: ReportDraftPayload): Observable<ReportDraftDetail> {
    return this.http.put<ReportDraftDetail>(
      `${environment.API.BASE_URL}/drafts/${id}`,
      payload,
      { headers: this.buildPublicHeaders() },
    );
  }

  updateDraftStatus(id: string, stato: ReportDraftStatus): Observable<ReportDraftDetail> {
    return this.http.patch<ReportDraftDetail>(
      `${environment.API.BASE_URL}/drafts/${id}/status`,
      { stato },
      { headers: this.buildPublicHeaders() },
    );
  }

  sendDraftToRefertatore(
    draftId: string,
  ): Observable<{ draft: ReportDraftDetail; emailSent: boolean }> {
    return this.http.post<{ draft: ReportDraftDetail; emailSent: boolean }>(
      `${environment.API.BASE_URL}/drafts/${draftId}/send-to-refertatore`,
      {},
      { headers: this.buildPublicHeaders() },
    );
  }

  deleteDraft(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.API.BASE_URL}/drafts/${id}`, {
      headers: this.buildPublicHeaders(),
    });
  }

  uploadDraftAttachment(
    draftId: string,
    payload: DraftAttachmentUploadPayload,
  ): Observable<DraftAttachmentMetadata> {
    return this.http.post<DraftAttachmentMetadata>(
      `${environment.API.BASE_URL}/drafts/${draftId}/attachments`,
      payload,
      {
        headers: this.buildPublicHeaders(),
      },
    );
  }

  listDraftAttachments(
    draftId: string,
    useReservedAuth: boolean | string = false,
  ): Observable<DraftAttachmentListResponse> {
    const reservedAuth = !!useReservedAuth;
    return this.http.get<DraftAttachmentListResponse>(
      `${environment.API.BASE_URL}/drafts/${draftId}/attachments`,
      {
        headers: reservedAuth ? undefined : this.buildPublicHeaders(),
        withCredentials: reservedAuth,
      },
    );
  }

  getDraftAttachmentDataUrl(
    draftId: string,
    attachmentId: string,
    useReservedAuth: boolean | string = false,
  ): Observable<{ dataUrl: string }> {
    const reservedAuth = !!useReservedAuth;
    return this.http.get<{ dataUrl: string }>(
      `${environment.API.BASE_URL}/drafts/${draftId}/attachments/${attachmentId}`,
      {
        headers: reservedAuth ? undefined : this.buildPublicHeaders(),
        withCredentials: reservedAuth,
        params: new HttpParams().set('encoding', 'data-url'),
      },
    );
  }

  getDraftAttachmentBase64(
    draftId: string,
    attachmentId: string,
    useReservedAuth: boolean | string = false,
  ): Observable<{ base64: string }> {
    const reservedAuth = !!useReservedAuth;
    return this.http.get<{ base64: string }>(
      `${environment.API.BASE_URL}/drafts/${draftId}/attachments/${attachmentId}`,
      {
        headers: reservedAuth ? undefined : this.buildPublicHeaders(),
        withCredentials: reservedAuth,
        params: new HttpParams().set('encoding', 'base64'),
      },
    );
  }

  getDraftAttachmentBlob(
    draftId: string,
    attachmentId: string,
    useReservedAuth: boolean | string = false,
  ): Observable<Blob> {
    const reservedAuth = !!useReservedAuth;
    return this.http.get(
      `${environment.API.BASE_URL}/drafts/${draftId}/attachments/${attachmentId}`,
      {
        headers: reservedAuth ? undefined : this.buildPublicHeaders(),
        withCredentials: reservedAuth,
        responseType: 'blob',
      },
    );
  }

  deleteDraftAttachment(draftId: string, attachmentId: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.API.BASE_URL}/drafts/${draftId}/attachments/${attachmentId}`,
      {
        headers: this.buildPublicHeaders(),
      },
    );
  }

  uploadSignedDraftPdf(
    draftId: string,
    payload: SignedDraftPdfUploadPayload,
    useReservedAuth: boolean | string = false,
  ): Observable<SignedDraftPdfUploadResponse> {
    const reservedAuth = !!useReservedAuth;
    return this.http.post<SignedDraftPdfUploadResponse>(
      reservedAuth
        ? `${environment.API.BASE_URL}/refertatore/drafts/${draftId}/signed-pdf`
        : `${environment.API.BASE_URL}/drafts/${draftId}/signed-pdf`,
      payload,
      {
        headers: reservedAuth ? this.buildAuthHeaders() : this.buildPublicHeaders(),
        withCredentials: reservedAuth,
      },
    );
  }

  listAdminUsers(): Observable<AdminUsersResponse> {
    return this.http.get<AdminUsersResponse>(`${environment.API.BASE_URL}/admin/users`, {
      withCredentials: true,
    });
  }

  createAdminUser(payload: any): Observable<any> {
    return this.http.post(`${environment.API.BASE_URL}/admin/users`, payload, {
      headers: this.buildAuthHeaders(),
      withCredentials: true,
    });
  }

  updateAdminUser(id: string, payload: any): Observable<any> {
    return this.http.put(`${environment.API.BASE_URL}/admin/users/${id}`, payload, {
      headers: this.buildAuthHeaders(),
      withCredentials: true,
    });
  }

  updateAdminUserStatus(id: string, active: boolean): Observable<any> {
    return this.http.patch(
      `${environment.API.BASE_URL}/admin/users/${id}/status`,
      { active },
      {
        headers: this.buildAuthHeaders(),
        withCredentials: true,
      },
    );
  }

  listAdminProfessionals(): Observable<ProfessionalsResponse> {
    return this.http.get<ProfessionalsResponse>(
      `${environment.API.BASE_URL}/admin/professionals`,
      { withCredentials: true },
    );
  }

  createAdminProfessional(payload: any): Observable<any> {
    return this.http.post(`${environment.API.BASE_URL}/admin/professionals`, payload, {
      headers: this.buildAuthHeaders(),
      withCredentials: true,
    });
  }

  updateAdminProfessional(id: string, payload: any): Observable<any> {
    return this.http.put(`${environment.API.BASE_URL}/admin/professionals/${id}`, payload, {
      headers: this.buildAuthHeaders(),
      withCredentials: true,
    });
  }

  updateAdminProfessionalStatus(id: string, active: boolean): Observable<any> {
    return this.http.patch(
      `${environment.API.BASE_URL}/admin/professionals/${id}/status`,
      { active },
      {
        headers: this.buildAuthHeaders(),
        withCredentials: true,
      },
    );
  }

  listAdminDrafts(filters: Partial<ReportDraftFilters> = {}): Observable<ReportDraftListResponse> {
    let params = new HttpParams();
    if (filters.tipo_referto) params = params.set('tipo_referto', filters.tipo_referto);
    if (filters.stato) params = params.set('stato', filters.stato);
    if (filters.q) params = params.set('q', filters.q);
    return this.http.get<ReportDraftListResponse>(`${environment.API.BASE_URL}/admin/drafts`, {
      params,
      withCredentials: true,
    });
  }

  listAdminArchive(filters: Partial<ReportDraftFilters> = {}): Observable<ReportDraftListResponse> {
    let params = new HttpParams();
    if (filters.tipo_referto) params = params.set('tipo_referto', filters.tipo_referto);
    if (filters.stato) params = params.set('stato', filters.stato);
    if (filters.q) params = params.set('q', filters.q);
    return this.http.get<ReportDraftListResponse>(`${environment.API.BASE_URL}/admin/archive`, {
      params,
      withCredentials: true,
    });
  }

  listAuditLogs(): Observable<AuditLogsResponse> {
    return this.http.get<AuditLogsResponse>(
      `${environment.API.BASE_URL}/admin/audit-logs`,
      { withCredentials: true },
    );
  }

  refertatoreMe(): Observable<AuthMeResponse> {
    return this.http.get<AuthMeResponse>(`${environment.API.BASE_URL}/refertatore/me`, {
      withCredentials: true,
    });
  }

  listRefertatoreDrafts(tipoReferto: 'emg' | 'psg'): Observable<ReportDraftListResponse> {
    return this.http.get<ReportDraftListResponse>(
      `${environment.API.BASE_URL}/refertatore/drafts`,
      {
        params: new HttpParams().set('tipo_referto', tipoReferto),
        withCredentials: true,
      },
    );
  }

  listRefertatoreArchive(tipoReferto: 'emg' | 'psg'): Observable<ReportDraftListResponse> {
    return this.http.get<ReportDraftListResponse>(
      `${environment.API.BASE_URL}/refertatore/archive`,
      {
        params: new HttpParams().set('tipo_referto', tipoReferto),
        withCredentials: true,
      },
    );
  }

  getRefertatoreDraft(id: string): Observable<ReportDraftDetail> {
    return this.http.get<ReportDraftDetail>(
      `${environment.API.BASE_URL}/refertatore/drafts/${id}`,
      { withCredentials: true },
    );
  }

  updateRefertatoreDraft(id: string, payload: ReportDraftPayload): Observable<ReportDraftDetail> {
    return this.http.put<ReportDraftDetail>(
      `${environment.API.BASE_URL}/refertatore/drafts/${id}`,
      payload,
      {
        headers: this.buildAuthHeaders(),
        withCredentials: true,
      },
    );
  }

  exportRefertatoreDraftPreview(id: string): Observable<void> {
    return this.http.post<void>(
      `${environment.API.BASE_URL}/refertatore/drafts/${id}/export-preview`,
      {},
      {
        headers: this.buildAuthHeaders(),
        withCredentials: true,
      },
    );
  }

  neurologistLogin(email: string, password: string): Observable<AuthLoginResponse> {
    return this.login(email, password);
  }

  listNeurologistEmgDrafts(_token?: string): Observable<ReportDraftListResponse> {
    return this.listRefertatoreDrafts('emg');
  }

  getNeurologistEmgDraft(_token: string, id: string): Observable<ReportDraftDetail> {
    return this.getRefertatoreDraft(id);
  }

  updateNeurologistEmgDraft(
    _token: string,
    id: string,
    payload: ReportDraftPayload,
  ): Observable<ReportDraftDetail> {
    return this.updateRefertatoreDraft(id, payload);
  }
}
