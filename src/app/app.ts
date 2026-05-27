import { Component, signal } from '@angular/core';
import { ReportEditor } from './report/report-editor';
import { ReportPreview } from './report/dev/report-preview/report-preview';

@Component({
  selector: 'app-root',
  imports: [ReportEditor],
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('remedic-report');
}
