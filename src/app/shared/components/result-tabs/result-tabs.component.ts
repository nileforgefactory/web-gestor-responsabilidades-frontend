import { Component, effect, input, output, signal } from '@angular/core';
import { BadgeComponent, BadgeVariant } from '../badge/badge.component';

export interface ResultBadge {
  label: string;
  variant: BadgeVariant;
}

export interface ResultItem {
  icon: string;
  title: string;
  body: string;
  badges?: ResultBadge[];
}

export type MatrizLevel  = 'P' | 'C' | 'S' | 'N';
export type BrechaStatus = 'ok' | 'critica' | 'duplicidad';

export interface MatrizRow {
  competencia:   string;
  leyBase:       string;
  nacion:        MatrizLevel;
  departamento:  MatrizLevel;
  municipio:     MatrizLevel;
  especializado: MatrizLevel;
  brecha:        BrechaStatus;
}

export interface ResultTab {
  id:            string;
  icon:          string;
  label:         string;
  count:         number;
  countVariant?: BadgeVariant;
  items:         ResultItem[];
  matrizRows?:   MatrizRow[];
}

@Component({
  selector: 'app-result-tabs',
  standalone: true,
  imports: [BadgeComponent],
  templateUrl: './result-tabs.component.html',
  styleUrl: './result-tabs.component.css',
})
export class ResultTabsComponent {
  tabs        = input<ResultTab[]>([]);
  showActions = input<boolean>(true);
  activateTab = input<string>('');

  addToPlan = output<void>();
  tabChange  = output<string>();

  activeTabId = signal<string>('');

  constructor() {
    effect(() => {
      const id = this.activateTab();
      if (id) this.activeTabId.set(id);
    }, { allowSignalWrites: true });
  }

  activeTab(): ResultTab | undefined {
    const id   = this.activeTabId();
    const tabs = this.tabs();
    if (!id && tabs.length) return tabs[0];
    return tabs.find(t => t.id === id) ?? tabs[0];
  }

  setTab(id: string): void {
    this.activeTabId.set(id);
    this.tabChange.emit(id);
  }

  isActive(id: string): boolean {
    return this.activeTab()?.id === id;
  }

  levelClass(level: MatrizLevel): string {
    return { P: 'lvl-P', C: 'lvl-C', S: 'lvl-S', N: 'lvl-N' }[level];
  }

  levelText(level: MatrizLevel): string {
    return level === 'N' ? '—' : level;
  }

  brechaInfo(status: BrechaStatus): { text: string; cls: string } {
    if (status === 'ok')         return { text: '✓ Cubierto',    cls: 'brecha-ok'  };
    if (status === 'critica')    return { text: '🚨 Sin resp.',  cls: 'brecha-red' };
    if (status === 'duplicidad') return { text: '⚠️ Duplicidad', cls: 'brecha-gold'};
    return { text: '—', cls: '' };
  }
}
