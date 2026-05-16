import { Component, input, output, signal } from '@angular/core';
import { BadgeComponent, BadgeVariant } from '../../../../shared/components/badge/badge.component';

export interface ResultBadge {
  label: string;
  variant: BadgeVariant;
}

export interface ResultItem {
  icon: string;
  title: string;
  body: string;
  badges?: ResultBadge[];
  extra?: string;
}

export interface ResultTab {
  id: string;
  icon: string;
  label: string;
  count: number;
  countVariant?: BadgeVariant;
  items: ResultItem[];
}

@Component({
  selector: 'app-result-tabs',
  standalone: true,
  imports: [BadgeComponent],
  templateUrl: './result-tabs.component.html',
  styleUrl: './result-tabs.component.css',
})
export class ResultTabsComponent {
  tabs      = input<ResultTab[]>([]);
  addToPlan = output<void>();

  activeTabId = signal<string>('');
  saving      = signal<boolean>(false);

  activeTab(): ResultTab | undefined {
    const id = this.activeTabId();
    const tabs = this.tabs();
    if (!id && tabs.length) return tabs[0];
    return tabs.find(t => t.id === id) ?? tabs[0];
  }

  setTab(id: string): void {
    this.activeTabId.set(id);
  }

  isActive(id: string): boolean {
    const active = this.activeTab();
    return active?.id === id;
  }
}
