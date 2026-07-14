import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faArrowUpFromBracket,
  faCircleCheck,
  faDatabase,
  faFileExcel,
  faMagnifyingGlass,
  faRotate,
  faSpinner,
  faStop,
  faTriangleExclamation,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ProyectoMatrizSGROut, SgrDuplicidadSeedService } from '../../core/services/sgr-duplicidad-seed.service';
import { PaginatorComponent } from '../../shared/components/paginator/paginator.component';
import {
  SidebarItem,
  SidebarSection,
  SidebarUser,
} from '../../shared/components/sidebar/sidebar.component';
import { BadgeVariant } from '../../shared/components/badge/badge.component';
import { RolCodigo } from '../../core/models/auth.model';

const ROL_LABEL: Record<RolCodigo, string> = {
  superadmin:    'Super Admin',
  administrador: 'Administrador',
  usuario:       'Usuario',
};

const ROL_BADGE: Record<RolCodigo, BadgeVariant> = {
  superadmin:    'purple',
  administrador: 'blue',
  usuario:       'green',
};

const PAGE_SIZE = 50;

@Component({
  selector: 'app-admin-sgr-matriz',
  standalone: true,
  imports: [FaIconComponent, PaginatorComponent],
  templateUrl: './admin-sgr-matriz.component.html',
  styleUrl: './admin-sgr-matriz.component.css',
})
export class AdminSgrMatrizComponent {
  private router = inject(Router);
  private confirmDialog = inject(ConfirmDialogService);
  readonly auth  = inject(AuthService);
  readonly seed  = inject(SgrDuplicidadSeedService);

  readonly faArrowLeft = faArrowLeft;
  readonly faArrowUpFromBracket = faArrowUpFromBracket;
  readonly faCircleCheck = faCircleCheck;
  readonly faDatabase = faDatabase;
  readonly faFileExcel = faFileExcel;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faRotate = faRotate;
  readonly faSpinner = faSpinner;
  readonly faStop = faStop;
  readonly faTriangleExclamation = faTriangleExclamation;
  readonly faXmark = faXmark;

  archivoSeleccionado = signal<File | null>(null);
  uploadModalOpen = signal(false);

  // ── Tabla de proyectos indexados ────────────────────────────────────────────
  proyectos = signal<ProyectoMatrizSGROut[]>([]);
  totalProyectos = signal(0);
  cargandoProyectos = signal(false);
  search = signal('');
  pagina = signal(1);
  readonly pageSize = PAGE_SIZE;

  backfillEnCurso = signal(false);
  backfillMsg = signal<string | null>(null);

  private searchDebounce: ReturnType<typeof setTimeout> | null = null;
  private prevEstadoSeed = '';

  sidebarSections = computed<SidebarSection[]>(() => [
    {
      label: this.auth.isAdmin() ? 'Administración' : 'Conocimiento',
      items: [
        ...(this.auth.isAdmin() ? [{ id: 'usuarios', icon: '👥', label: 'Usuarios y roles' }] : []),
        { id: 'sgr-matriz', icon: '📊', label: 'Matriz de proyectos', status: 'active' as const },
      ],
    },
    {
      label: 'Navegación',
      items: [
        { id: 'volver', icon: '←', label: 'Volver al sistema' },
      ],
    },
  ]);

  sidebarUser = computed<SidebarUser | null>(() => {
    const u = this.auth.user();
    if (!u) return null;
    return {
      initials:    u.nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase(),
      avatarColor: '#1A3A6B',
      name:        u.nombre,
      role:        ROL_LABEL[u.rol],
      roleVariant: ROL_BADGE[u.rol],
    };
  });

  constructor() {
    if (this.auth.isAdmin()) this.seed.refrescarEstado();
    this.cargarProyectos();

    // Refresca la tabla apenas termina una carga de Excel (idle/running -> completed).
    effect(() => {
      const estado = this.seed.estado().estado;
      if (this.prevEstadoSeed === 'running' && estado === 'completed') {
        this.pagina.set(1);
        this.cargarProyectos();
      }
      this.prevEstadoSeed = estado;
    });
  }

  onSidebarClick(item: SidebarItem): void {
    if (item.id === 'volver') this.router.navigate(['/cargar-plan']);
    if (item.id === 'usuarios') this.router.navigate(['/admin/usuarios']);
  }

  openUploadModal(): void {
    this.uploadModalOpen.set(true);
  }

  closeUploadModal(): void {
    this.uploadModalOpen.set(false);
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.archivoSeleccionado.set(file);
  }

  subir(): void {
    const file = this.archivoSeleccionado();
    if (!file || this.seed.isRunning()) return;
    this.seed.iniciar(file);
  }

  cancelar(): void {
    this.seed.cancelar();
  }

  faseLabel(): string {
    const labels: Record<string, string> = {
      extrayendo: 'Extrayendo archivo…',
      leyendo_filas: 'Leyendo filas del Excel…',
      indexando: 'Indexando proyectos en Qdrant…',
    };
    const fase = this.seed.estado().fase;
    return (fase && labels[fase]) || 'Procesando…';
  }

  // ── Tabla de proyectos indexados ────────────────────────────────────────────
  cargarProyectos(): void {
    this.cargandoProyectos.set(true);
    this.seed.listarProyectos({
      search: this.search() || undefined,
      skip: (this.pagina() - 1) * this.pageSize,
      limit: this.pageSize,
    }).subscribe({
      next: res => {
        this.proyectos.set(res.items);
        this.totalProyectos.set(res.total);
        this.cargandoProyectos.set(false);
      },
      error: () => this.cargandoProyectos.set(false),
    });
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.pagina.set(1);
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.cargarProyectos(), 350);
  }

  onPageChange(p: number): void {
    this.pagina.set(p);
    this.cargarProyectos();
  }

  async ejecutarBackfill(): Promise<void> {
    if (this.backfillEnCurso()) return;
    const ok = await this.confirmDialog.confirm({
      title: 'Recuperar proyectos ya indexados',
      message: 'Reconstruye esta tabla leyendo lo que ya está indexado en Qdrant. Reemplaza el contenido actual de la tabla. ¿Continuar?',
      confirmLabel: 'Recuperar',
      danger: false,
    });
    if (!ok) return;

    this.backfillEnCurso.set(true);
    this.backfillMsg.set(null);
    this.seed.backfillDesdeQdrant().subscribe({
      next: res => {
        this.backfillEnCurso.set(false);
        this.backfillMsg.set(`${res.proyectos_recuperados} proyectos recuperados.`);
        this.pagina.set(1);
        this.cargarProyectos();
      },
      error: err => {
        this.backfillEnCurso.set(false);
        this.backfillMsg.set(err.error?.detail ?? 'No se pudo recuperar el catálogo desde Qdrant.');
      },
    });
  }
}
