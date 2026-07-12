import { Component, ChangeDetectionStrategy, HostListener, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faBars, faXmark } from '@fortawesome/free-solid-svg-icons';
import { BadgeComponent, BadgeVariant } from '../badge/badge.component';
import { IconComponent } from '../icon/icon.component';

export type SidebarItemStatus = 'active' | 'done' | 'pending' | 'default';

export interface SidebarItem {
  id?: string;
  icon: string;
  label: string;
  sublabel?: string;
  sublabelColor?: string;
  status?: SidebarItemStatus;
  badge?: string | number;
}

export interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

export interface SidebarUser {
  initials: string;
  avatarColor?: string;
  name: string;
  role: string;
  roleVariant?: BadgeVariant;
}

/**
 * Menú secundario/contextual de una vista. Ya no ocupa una columna fija (evita el
 * "doble menú" junto al riel global): se muestra como un botón que abre un panel
 * deslizante en overlay, al estilo del modal de ajustes de Claude.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, IconComponent, FaIconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  readonly faCheck = faCheck;
  readonly faBars = faBars;
  readonly faXmark = faXmark;

  sections = input<SidebarSection[]>([]);
  user     = input<SidebarUser | null>(null);
  /** Texto del botón lanzador (p. ej. "Proceso", "Estadísticas"). */
  label    = input<string>('Menú');

  itemClick = output<SidebarItem>();

  readonly open = signal(false);

  toggle(): void { this.open.update(v => !v); }
  close(): void { this.open.set(false); }

  @HostListener('document:keydown.escape')
  onEsc(): void { this.close(); }

  onItemClick(item: SidebarItem): void {
    if (item.status !== 'pending') {
      this.itemClick.emit(item);
      this.close();
    }
  }
}
