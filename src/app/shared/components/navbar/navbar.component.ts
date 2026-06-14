import { Component, EventEmitter, Output, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MeResponse, RolCodigo } from '../../../core/models/auth.model';

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
  superadmin:    'var(--purple)',
  administrador: 'var(--accent)',
  usuario:       'var(--green)',
};

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  appName = input<string>('Gestor de Leyes');
  appIcon = input<string>('⚖️');
  items   = input<NavItem[]>([]);
  user    = input<MeResponse | null>(null);

  @Output() logoutClick = new EventEmitter<void>();

  initials(nombre: string): string {
    return nombre
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }

  rolLabel(rol: RolCodigo): string  { return ROL_LABEL[rol] ?? rol; }
  rolColor(rol: RolCodigo): string  { return ROL_COLOR[rol] ?? 'var(--accent)'; }

  onLogout(): void { this.logoutClick.emit(); }
}
