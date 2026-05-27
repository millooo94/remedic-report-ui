import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { REPORT_PREVIEW_MOCK } from '../../mock/report-preview.mock';
import { ReportHtmlBuilderService } from '../../services/report-html-builder.service';

@Component({
  selector: 'report-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report-preview.html',
  styleUrls: ['./report-preview.css'],
})
export class ReportPreview {
  private htmlBuilder = inject(ReportHtmlBuilderService);
  private sanitizer = inject(DomSanitizer);

  rawHtml = this.htmlBuilder.build(REPORT_PREVIEW_MOCK);
  previewHtml: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(this.rawHtml);
}
