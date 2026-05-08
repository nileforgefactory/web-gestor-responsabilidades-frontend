import { Component, input, output } from '@angular/core';
import { BadgeComponent, BadgeVariant } from '../badge/badge.component';

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
  imports: [BadgeComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  sections  = input<SidebarSection[]>([]);
  user      = input<SidebarUser | null>(null);

  itemClick = output<SidebarItem>();

  onItemClick(item: SidebarItem): void {
    if (item.status !== 'pending') {
      this.itemClick.emit(item);
    }
  }
}
