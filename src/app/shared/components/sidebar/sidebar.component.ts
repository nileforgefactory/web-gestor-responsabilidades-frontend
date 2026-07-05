import { Component, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
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

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [BadgeComponent, IconComponent, FaIconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  readonly faCheck = faCheck;

  sections  = input<SidebarSection[]>([]);
  user      = input<SidebarUser | null>(null);

  itemClick = output<SidebarItem>();

  onItemClick(item: SidebarItem): void {
    if (item.status !== 'pending') {
      this.itemClick.emit(item);
    }
  }
}
