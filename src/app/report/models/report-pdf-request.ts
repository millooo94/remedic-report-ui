export interface ReportPdfRequest {
  html: string;
  specializzazione: string;
  medico: string;
  paziente_nome: string;
  data_nascita: string;
  titolo_visita: string;
  data_visita: string;
  attachments?: {
    pdfs?: Array<{
      fileName: string;
      mimeType: 'application/pdf';
      base64: string;
    }>;
    files?: Array<{
      fileName: string;
      mimeType:
        | 'application/pdf'
        | 'image/png'
        | 'image/jpeg'
        | 'image/jpg'
        | 'image/webp';
      base64: string;
    }>;
  };
}
