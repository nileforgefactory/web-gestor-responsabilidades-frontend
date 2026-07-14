import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faArrowUpFromBracket,
  faCircleCheck,
  faFileExcel,
  faSpinner,
  faStop,
  faTriangleExclamation,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../core/services/auth.service';
import { SgrDuplicidadSeedService } from '../../core/services/sgr-duplicidad-seed.service';
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

@Component({
  selector: 'app-admin-sgr-matriz',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './admin-sgr-matriz.component.html',
  styleUrl: './admin-sgr-matriz.component.css',
})
export class AdminSgrMatrizComponent {
  private router = inject(Router);
  readonly auth  = inject(AuthService);
  readonly seed  = inject(SgrDuplicidadSeedService);

  readonly faArrowLeft = faArrowLeft;
  readonly faArrowUpFromBracket = faArrowUpFromBracket;
  readonly faCircleCheck = faCircleCheck;
  readonly faFileExcel = faFileExcel;
  readonly faSpinner = faSpinner;
  readonly faStop = faStop;
  readonly faTriangleExclamation = faTriangleExclamation;

  archivoSeleccionado = signal<File | null>(null);

  sidebarSections = computed<SidebarSection[]>(() => [
    {
      label: 'Administración',
      items: [
        { id: 'usuarios', icon: '👥', label: 'Usuarios y roles' },
        { id: 'sgr-matriz', icon: '📊', label: 'Matriz SGR', status: 'active' },
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
    this.seed.refrescarEstado();
  }

  onSidebarClick(item: SidebarItem): void {
    if (item.id === 'volver') this.router.navigate(['/cargar-plan']);
    if (item.id === 'usuarios') this.router.navigate(['/admin/usuarios']);
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
}
