import { Component, EventEmitter, Output, input, inject, effect, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faScaleBalanced, faBolt, faStop, faRightFromBracket, faCircleCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { MeResponse, RolCodigo } from '../../../core/models/auth.model';
import { BackgroundScraperService } from '../../../core/services/background-scraper.service';
import { PlanContextService } from '../../../core/services/plan-context.service';

export interface NavItem {
  label: string;
  route: string;
  icon?: string;
  highlighted?: boolean;
}

const ROL_LABEL: Record<RolCodigo, string> = {
  superadmin:    'Super Admin',
  administrador: 'Administrador',
  usuario:       'Usuario',
};

const ROL_COLOR: Record<RolCodigo, string> = {
  superadmin:    'var(--color-purple)',
  administrador: 'var(--color-accent)',
  usuario:       'var(--color-success)',
};

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FaIconComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  readonly faScaleBalanced = faScaleBalanced;
  readonly faBolt = faBolt;
  readonly faStop = faStop;
  readonly faRightFromBracket = faRightFromBracket;
  readonly faCircleCheck = faCircleCheck;
  readonly faXmark = faXmark;

  appName = input<string>('Gestor de Leyes');
  appIcon = input<string>('⚖️');
  items   = input<NavItem[]>([]);
  user    = input<MeResponse | null>(null);

  @Output() logoutClick = new EventEmitter<void>();

  readonly scraper = inject(BackgroundScraperService);
  readonly planContext = inject(PlanContextService);
  readonly showCompletedAlert = signal(false);
  private prevEstado = '';

  constructor() {
    effect(() => {
      const estado = this.scraper.estado().estado;
      if (this.prevEstado === 'running' && estado === 'completed') {
        this.showCompletedAlert.set(true);
        setTimeout(() => this.showCompletedAlert.set(false), 6000);
      }
      this.prevEstado = estado;
    });

    this.planContext.cargarPlanes();
  }

  initials(nombre: string): string {
    return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  rolLabel(rol: RolCodigo): string { return ROL_LABEL[rol] ?? rol; }
  rolColor(rol: RolCodigo): string { return ROL_COLOR[rol] ?? 'var(--color-accent)'; }

  onLogout(): void { this.logoutClick.emit(); }

  toggleScraper(): void {
    if (this.scraper.isRunning()) {
      this.scraper.cancelar();
    } else {
      this.scraper.iniciar();
    }
  }

  dismissAlert(): void {
    this.showCompletedAlert.set(false);
  }
}
