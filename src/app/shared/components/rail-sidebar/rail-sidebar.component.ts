import { Component, ChangeDetectionStrategy, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from '../../../core/services/layout.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faScaleBalanced, faPlus, faAngleLeft, faAngleRight,
  faRightFromBracket, faChevronDown,
} from '@fortawesome/free-solid-svg-icons';
import { IconComponent } from '../icon/icon.component';
import { BadgeComponent, BadgeVariant } from '../badge/badge.component';
import { MeResponse, RolCodigo } from '../../../core/models/auth.model';

export interface RailItem {
  label: string;
  route: string;
  /** emoji legado -> se mapea a FontAwesome via app-icon */
  icon: string;
  badge?: string | number;
  /** coincidencia exacta de ruta activa (por defecto: prefijo) */
  exact?: boolean;
}

export interface RailGroup {
  /** etiqueta de sección (uppercase). Ausente = grupo primario sin título */
  label?: string;
  items: RailItem[];
}

const ROL_LABEL: Record<RolCodigo, string> = {
  superadmin: 'Super Admin',
  administrador: 'Administrador',
  usuario: 'Usuario',
};

const ROL_VARIANT: Record<RolCodigo, BadgeVariant> = {
  superadmin: 'purple',
  administrador: 'blue',
  usuario: 'green',
};

@Component({
  selector: 'app-rail-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, FaIconComponent, IconComponent, BadgeComponent],
  templateUrl: './rail-sidebar.component.html',
  styleUrl: './rail-sidebar.component.css',
  host: {
    '[class.is-collapsed]': 'collapsed()',
    '[class.mobile-open]': 'layout.mobileNavOpen()',
    '[style.width.px]': 'layout.railWidth()',
  },
})
export class RailSidebarComponent {
  readonly layout = inject(LayoutService);

  readonly faScaleBalanced = faScaleBalanced;
  readonly faPlus = faPlus;
  readonly faAngleLeft = faAngleLeft;
  readonly faAngleRight = faAngleRight;
  readonly faRightFromBracket = faRightFromBracket;
  readonly faChevronDown = faChevronDown;

  /** Título del producto (héroe) */
  appName = input<string>('Propuestas SGR');
  /** CTA principal: ruta de "Nueva propuesta" */
  createRoute = input<string>('/sgr/evaluar-proyecto');
  groups = input<RailGroup[]>([]);
  user = input<MeResponse | null>(null);

  logoutClick = output<void>();

  /** Estado colapsado — compartido vía LayoutService (persistido en localStorage) */
  readonly collapsed = this.layout.railCollapsed;
  readonly userMenuOpen = signal(false);

  toggleCollapsed(): void {
    this.layout.toggleRailCollapsed();
    this.userMenuOpen.set(false);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update(v => !v);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  onLogout(): void {
    this.userMenuOpen.set(false);
    this.logoutClick.emit();
  }

  initials(nombre: string): string {
    return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  readonly rolLabel = computed(() => {
    const u = this.user();
    return u ? (ROL_LABEL[u.rol] ?? u.rol) : '';
  });

  readonly rolVariant = computed<BadgeVariant>(() => {
    const u = this.user();
    return u ? (ROL_VARIANT[u.rol] ?? 'gray') : 'gray';
  });
}
