import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';

@Component({
  selector: 'rich-text-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './rich-text-field.html',
  styleUrl: './rich-text-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextField implements AfterViewInit, OnDestroy {
  @Input({ required: true }) control!: FormControl<string | null>;

  @ViewChild('editorHost', { static: true })
  editorHost!: ElementRef<HTMLElement>;

  editor: Editor | null = null;
  private controlSub?: Subscription;
  private isSyncing = false;

  ngAfterViewInit(): void {
    this.initEditor();
    this.bindControl();
  }

  private initEditor(): void {
    this.editor?.destroy();

    const initialContent = this.normalizeEditorHtml(this.control.value ?? '');

    if (initialContent !== (this.control.value ?? '')) {
      this.control.setValue(initialContent, { emitEvent: false });
    }

    this.editor = new Editor({
      element: this.editorHost.nativeElement,

      extensions: [
        StarterKit.configure({
          orderedList: false,
        }),
        Underline,
      ],

      content: initialContent,

      editorProps: {
        attributes: {
          class: 'tiptap-editor',
          spellcheck: 'true',
          autocapitalize: 'sentences',
          autocomplete: 'on',
          autocorrect: 'on',
        },

        handleKeyDown: (view, event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            const { $from } = view.state.selection;
            const parent = $from.parent;

            const isEmptyParagraph =
              parent.type.name === 'paragraph' &&
              parent.textContent.trim() === '';

            // Consenti il primo invio dopo testo.
            // Blocca solo invio su paragrafo già vuoto.
            if (isEmptyParagraph) {
              event.preventDefault();
              return true;
            }
          }

          return false;
        },
      },

      onUpdate: ({ editor }) => {
        if (this.isSyncing) return;

        const html = editor.getHTML();

        if (html !== (this.control.value ?? '')) {
          this.control.setValue(html, { emitEvent: false });
          this.control.markAsDirty();
          this.control.markAsTouched();
        }
      },

      onBlur: () => {
        this.normalizeCurrentEditorContent();
      },
    });
  }

  private bindControl(): void {
    this.controlSub?.unsubscribe();

    this.controlSub = this.control.valueChanges.subscribe((value) => {
      if (!this.editor || this.isSyncing) return;

      const next = this.normalizeEditorHtml(value ?? '');
      const current = this.normalizeEditorHtml(this.editor.getHTML());

      if (next !== (value ?? '')) {
        this.control.setValue(next, { emitEvent: false });
      }

      if (current !== next) {
        this.isSyncing = true;
        this.editor.commands.setContent(next, { emitUpdate: false });
        this.isSyncing = false;
      }
    });
  }

  focusEditor(): void {
    this.editor?.chain().focus().run();
  }

  private normalizeCurrentEditorContent(): void {
    if (!this.editor || this.isSyncing) return;

    const rawHtml = this.editor.getHTML();
    const normalizedHtml = this.normalizeEditorHtml(rawHtml);

    if (normalizedHtml !== rawHtml) {
      this.isSyncing = true;
      this.editor.commands.setContent(normalizedHtml, { emitUpdate: false });
      this.isSyncing = false;
    }

    if (normalizedHtml !== (this.control.value ?? '')) {
      this.control.setValue(normalizedHtml, { emitEvent: false });
    }
  }

  private normalizeEditorHtml(value: string): string {
    if (!value?.trim()) {
      return '<p></p>';
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = value;

    const children = Array.from(wrapper.children) as HTMLElement[];

    for (const el of children) {
      if (this.isEmptyParagraph(el)) {
        el.remove();
      }
    }

    const cleaned = wrapper.innerHTML.trim();

    return cleaned || '<p></p>';
  }

  private isEmptyParagraph(el: HTMLElement | undefined): boolean {
    if (!el) return false;
    if (el.tagName !== 'P') return false;

    const html = el.innerHTML
      .replace(/&nbsp;/gi, '')
      .replace(/\s+/g, '')
      .replace(/<br\s*\/?>/gi, '');

    const text = (el.textContent || '').replace(/\s+/g, '');

    return html === '' && text === '';
  }

  toggleBold(): void {
    this.editor?.chain().focus().toggleBold().run();
  }

  toggleItalic(): void {
    this.editor?.chain().focus().toggleItalic().run();
  }

  toggleUnderline(): void {
    this.editor?.chain().focus().toggleUnderline().run();
  }

  toggleBulletList(): void {
    this.editor?.chain().focus().toggleBulletList().run();
  }

  isActive(name: string): boolean {
    return this.editor?.isActive(name) ?? false;
  }

  ngOnDestroy(): void {
    this.controlSub?.unsubscribe();
    this.editor?.destroy();
    this.editor = null;
  }
}
