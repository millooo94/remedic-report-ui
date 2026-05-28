import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ReportPdfRequest } from '../models/report-pdf-request';
import { environment } from '../../../environments/environment';
import {
  ReportDraftDetail,
  ReportDraftFilters,
  ReportDraftListResponse,
  ReportDraftPayload,
  ReportDraftStatus,
} from '../models/report-draft';

@Injectable({
  providedIn: 'root',
})
export class ReportApiService {
  constructor(private http: HttpClient) {}

  private buildHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-api-key': environment.API.PUBLIC_PDF_API_KEY,
    });
  }

  generatePdf(payload: ReportPdfRequest): Observable<string> {
    return this.http.post<string>(`${environment.API.BASE_URL}/pdf`, payload, {
      headers: this.buildHeaders(),
      responseType: 'text' as 'json',
    });
  }

  createDraft(payload: ReportDraftPayload): Observable<ReportDraftDetail> {
    return this.http.post<ReportDraftDetail>(
      `${environment.API.BASE_URL}/drafts`,
      payload,
      { headers: this.buildHeaders() },
    );
  }

  listDrafts(filters: ReportDraftFilters): Observable<ReportDraftListResponse> {
    let params = new HttpParams()
      .set('limit', String(filters.limit))
      .set('offset', String(filters.offset));

    if (filters.tipo_referto) {
      params = params.set('tipo_referto', filters.tipo_referto);
    }

    if (filters.stato) {
      params = params.set('stato', filters.stato);
    }

    if (filters.q.trim()) {
      params = params.set('q', filters.q.trim());
    }

    return this.http.get<ReportDraftListResponse>(
      `${environment.API.BASE_URL}/drafts`,
      {
        headers: this.buildHeaders(),
        params,
      },
    );
  }

  getDraft(id: string): Observable<ReportDraftDetail> {
    return this.http.get<ReportDraftDetail>(
      `${environment.API.BASE_URL}/drafts/${id}`,
      { headers: this.buildHeaders() },
    );
  }

  updateDraft(id: string, payload: ReportDraftPayload): Observable<ReportDraftDetail> {
    return this.http.put<ReportDraftDetail>(
      `${environment.API.BASE_URL}/drafts/${id}`,
      payload,
      { headers: this.buildHeaders() },
    );
  }

  updateDraftStatus(id: string, stato: ReportDraftStatus): Observable<ReportDraftDetail> {
    return this.http.patch<ReportDraftDetail>(
      `${environment.API.BASE_URL}/drafts/${id}/status`,
      { stato },
      { headers: this.buildHeaders() },
    );
  }

  deleteDraft(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.API.BASE_URL}/drafts/${id}`, {
      headers: this.buildHeaders(),
    });
  }
}
