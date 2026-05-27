import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ReportPdfRequest } from '../models/report-pdf-request';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReportApiService {
  constructor(private http: HttpClient) {}

  generatePdf(payload: ReportPdfRequest): Observable<string> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-api-key': environment.API.PUBLIC_PDF_API_KEY,
    });

    return this.http.post<string>(`${environment.API.BASE_URL}/pdf`, payload, {
      headers,
      responseType: 'text' as 'json',
    });
  }
}
