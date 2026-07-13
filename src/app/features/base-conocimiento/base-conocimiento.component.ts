import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBolt,
  faFolderOpen,
  faInbox,
  faDownload,
  faCircleCheck,
  faTriangleExclamation,
  faLink,
  faMagnifyingGlass,
  faRotate,
  faLightbulb,
  faPenNib,
} from '@fortawesome/free-solid-svg-icons';
import {
  SidebarComponent,
  SidebarItem,
  SidebarSection,
  SidebarUser,
} from '../../shared/components/sidebar/sidebar.component';
import { RagApiService } from '../../core/services/rag-api.service';
import { PlanApiService } from '../../core/services/plan-api.service';
import { environment } from '../../../environments/environment';

export type UploadTab  = 'file' | 'text';
export type DocStatus  = 'indexado' | 'procesando' | 'pendiente' | 'error';
export type ApiStatus  = 'checking' | 'online' | 'offline';

export interface KnowledgeDoc {
  id:       string;
  nombre:   string;
  tipo:     string;
  chunks:   number;
  fecha:    Date;
  status:   DocStatus;
  size?:    string;
}


@Component({
  selector: 'app-base-conocimiento',
  standalone: true,
  imports: [SidebarComponent, FormsModule, DatePipe, DecimalPipe, FaIconComponent],
  templateUrl: './base-conocimiento.component.html',
  styleUrl: './base-conocimiento.component.css',
})
export class BaseConocimientoComponent implements OnInit {
  private ragApi  = inject(RagApiService);
  private planApi = inject(PlanApiService);
  private router  = inject(Router);

  readonly faBolt = faBolt;
  readonly faFolderOpen = faFolderOpen;
  readonly faInbox = faInbox;
  readonly faDownload = faDownload;
  readonly faCircleCheck = faCircleCheck;
  readonly faTriangleExclamation = faTriangleExclamation;
  readonly faLink = faLink;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faRotate = faRotate;
  readonly faLightbulb = faLightbulb;
  readonly faPenNib = faPenNib;

  // ── Upload state ─────────────────────────────────────────────────
  activeTab      = signal<UploadTab>('file');
  isDragging     = signal(false);
  isUploading    = signal(false);
  uploadProgress = signal(0);
  uploadError    = signal<string | null>(null);
  uploadSuccess  = signal<string | null>(null);
  pendingFile    = signal<File | null>(null);

  // ── Text form (plain properties — compatibles con ngModel) ──────
  textTitle    = '';
  textDocType  = 'ley';
  textContent  = '';

  isSubmittingText = signal(false);
  textError        = signal<string | null>(null);
  textSuccess      = signal<string | null>(null);

  // ── API / service health ─────────────────────────────────────────
  apiStatus    = signal<ApiStatus>('checking');
  qdrantStatus = signal<ApiStatus>('checking');
  ollamaStatus = signal<ApiStatus>('checking');

  // ── Knowledge base documents ─────────────────────────────────────
  documents = signal<KnowledgeDoc[]>([]);

  totalDocs    = computed(() => this.documents().length);
  totalChunks  = computed(() => this.documents().reduce((a, d) => a + d.chunks, 0));
  indexedCount = computed(() => this.documents().filter(d => d.status === 'indexado').length);

  // ── Sidebar ──────────────────────────────────────────────────────
  readonly sidebarUser: SidebarUser = {
    initials:    'AL',
    avatarColor: '#059669',
    name:        'Alc. López',
    role:        'Municipal',
    roleVariant: 'green',
  };

  sidebarSections = computed<SidebarSection[]>(() => [
    {
      label: 'Navegación',
      items: [
        { id: 'nav:cargar-plan',  icon: '📂', label: 'Cargar plan'          },
        { id: 'nav:biblioteca',   icon: '📚', label: 'Biblioteca de planes' },
        { id: 'nav:busqueda',     icon: '🔍', label: 'Búsqueda RAG'         },
        { id: 'nav:base',         icon: '⚡', label: 'Base de conocimiento', status: 'active' as const },
      ],
    },
    {
      label: 'Estadísticas',
      items: [
        { icon: '📄', label: 'Documentos indexados', badge: this.totalDocs()    },
        { icon: '🔢', label: 'Fragmentos vectoriales', badge: this.totalChunks() },
        { icon: '✅', label: 'Activos',               badge: this.indexedCount() },
      ],
    },
    {
      label: 'Formatos',
      items: [
        { icon: '📕', label: 'PDF' },
        { icon: '📝', label: 'TXT / Markdown' },
        { icon: '✍️', label: 'Texto directo' },
      ],
    },
  ]);

  onSidebarItemClick(item: SidebarItem): void {
    const id = item.id ?? '';
    if (id === 'nav:cargar-plan') this.router.navigate(['/cargar-plan']);
    else if (id === 'nav:biblioteca') this.router.navigate(['/biblioteca']);
    else if (id === 'nav:busqueda') this.router.navigate(['/busqueda-raag']);
  }

  ngOnInit(): void {
    this.checkApiHealth();
    this.loadDocuments();
  }

  private async loadDocuments(): Promise<void> {
    try {
      const docs = await firstValueFrom(
        this.planApi.listConocimiento({ coleccion_id: environment.ragCollection, limit: 500 }),
      );
      // Always replace mock data when backend responds, even if empty
      this.documents.set(
        docs.map(d => ({
          id:     d.id,
          nombre: d.nombre,
          tipo:   d.tipo,
          chunks: d.chunk_count,
          fecha:  new Date(d.creado_en),
          status: (d.estado as DocStatus) ?? 'indexado',
          size:   d.archivo_tamano ? this.formatSize(d.archivo_tamano) : undefined,
        })),
      );
    } catch {
      // backend unavailable — list stays empty
    }
  }

  // ── Tab ───────────────────────────────────────────────────────────
  setTab(tab: UploadTab): void {
    this.activeTab.set(tab);
    this.uploadError.set(null);
    this.textError.set(null);
    this.uploadSuccess.set(null);
    this.textSuccess.set(null);
  }

  // ── File upload ───────────────────────────────────────────────────
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.uploadFile(file);
  }

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.uploadFile(file);
  }

  resetUpload(): void {
    this.uploadSuccess.set(null);
    this.uploadError.set(null);
    this.uploadProgress.set(0);
    this.pendingFile.set(null);
  }

  private uploadFile(file: File): void {
    this.pendingFile.set(file);
    this.isUploading.set(true);
    this.uploadError.set(null);
    this.uploadSuccess.set(null);
    this.uploadProgress.set(5);

    const progressTimer = setInterval(() => {
      const cur = this.uploadProgress();
      if (cur < 80) this.uploadProgress.set(cur + Math.random() * 12);
    }, 350);

    this.ragApi.ingestFile(file, { collection_id: environment.ragCollection }).subscribe({
      next: (res) => {
        clearInterval(progressTimer);
        this.uploadProgress.set(100);

        const doc: KnowledgeDoc = {
          id:     res.document_id,
          nombre: file.name,
          tipo:   this.inferType(file.name),
          chunks: res.chunks_indexed,
          fecha:  new Date(),
          status: 'indexado',
          size:   this.formatSize(file.size),
        };

        this.documents.update(ds => [doc, ...ds]);
        this.isUploading.set(false);
        this.uploadSuccess.set(
          `"${file.name}" indexado con ${res.chunks_indexed} fragmentos.`,
        );

        // Register in MySQL knowledge base (best-effort)
        this.planApi.createConocimiento({
          nombre:         file.name,
          tipo:           this.inferType(file.name),
          coleccion_id:   environment.ragCollection,
          archivo_nombre: file.name,
          archivo_tamano: file.size,
          qdrant_doc_id:  res.document_id,
          chunk_count:    res.chunks_indexed,
          estado:         'indexado',
        }).subscribe({ error: () => { /* silent — MySQL optional */ } });
      },
      error: (err: Error) => {
        clearInterval(progressTimer);
        this.isUploading.set(false);
        this.uploadProgress.set(0);
        this.uploadError.set(err.message);
      },
    });
  }

  // ── Text ingestion ────────────────────────────────────────────────
  onSubmitText(): void {
    if (!this.textContent.trim()) return;
    this.isSubmittingText.set(true);
    this.textError.set(null);
    this.textSuccess.set(null);

    const docId = `${this.textDocType}_${Date.now()}`;
    this.ragApi.ingestText({
      collection_id: environment.ragCollection,
      document_id:   docId,
      content:       this.textContent,
    }).subscribe({
      next: (res) => {
        const nombre = this.textTitle || 'Documento sin título';
        const doc: KnowledgeDoc = {
          id:     res.document_id,
          nombre,
          tipo:   this.textDocType,
          chunks: res.chunks_indexed,
          fecha:  new Date(),
          status: 'indexado',
        };
        this.documents.update(ds => [doc, ...ds]);
        this.isSubmittingText.set(false);
        this.textSuccess.set(`Texto indexado con ${res.chunks_indexed} fragmentos.`);

        // Register in MySQL knowledge base (best-effort)
        this.planApi.createConocimiento({
          nombre,
          tipo:         this.textDocType,
          coleccion_id: environment.ragCollection,
          qdrant_doc_id: res.document_id,
          chunk_count:   res.chunks_indexed,
          estado:        'indexado',
        }).subscribe({ error: () => { /* silent — MySQL optional */ } });

        this.textTitle   = '';
        this.textContent = '';
      },
      error: (err: Error) => {
        this.isSubmittingText.set(false);
        this.textError.set(err.message);
      },
    });
  }

  // ── API health ────────────────────────────────────────────────────
  checkApiHealth(): void {
    this.apiStatus.set('checking');
    this.qdrantStatus.set('checking');
    this.ollamaStatus.set('checking');

    this.ragApi.healthReady().subscribe({
      next: (res) => {
        this.apiStatus.set(res.healthy ? 'online' : 'offline');
        this.qdrantStatus.set(res.checks?.qdrant?.reachable ? 'online' : 'offline');
        const ol = res.checks?.ollama;
        const ollamaOk = ol?.daemon_reachable === true
          && ol?.embedding_model_registered === true
          && ol?.chat_model_registered === true;
        this.ollamaStatus.set(ollamaOk ? 'online' : 'offline');
      },
      error: () => {
        this.apiStatus.set('offline');
        this.qdrantStatus.set('offline');
        this.ollamaStatus.set('offline');
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────
  private inferType(filename: string): string {
    const n = filename.toLowerCase();
    if (n.includes('ley'))                         return 'ley';
    if (n.includes('dec') || n.includes('decreto')) return 'decreto';
    if (n.includes('res'))                         return 'resolucion';
    if (n.includes('circ'))                        return 'circular';
    return 'pdf';
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1_048_576)   return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }

  apiStatusLabel(status: ApiStatus): string {
    return status === 'online' ? '✅ Online' : status === 'checking' ? '🔄 Verificando…' : '❌ Offline';
  }
}
