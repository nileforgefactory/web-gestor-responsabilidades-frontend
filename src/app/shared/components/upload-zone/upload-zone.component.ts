import { Component, ElementRef, ViewChild, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-upload-zone',
  standalone: true,
  templateUrl: './upload-zone.component.html',
  styleUrl: './upload-zone.component.css',
})
export class UploadZoneComponent {
  accept = input<string>('.pdf,.doc,.docx,.txt,.html');
  multiple = input<boolean>(false);
  disabled = input<boolean>(false);

  filesSelected = output<File[]>();

  isDragging = signal(false);
  file = signal<File | null>(null);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    if (this.disabled()) return;
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(false);
    if (this.disabled()) return;
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length) this.handleFiles(files);
  }

  onClick(): void {
    if (this.disabled()) return;
    this.fileInput.nativeElement.click();
  }

  onFileChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length) this.handleFiles(files);
  }

  clear(e: MouseEvent): void {
    e.stopPropagation();
    this.file.set(null);
    this.fileInput.nativeElement.value = '';
  }

  private handleFiles(files: File[]): void {
    this.file.set(files[0]);
    this.filesSelected.emit(files);
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
