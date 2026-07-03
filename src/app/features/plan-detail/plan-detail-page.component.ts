import { Component, computed, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { PlanService } from '../../core/services/plan.service';
import { PlanApiService } from '../../core/services/plan-api.service';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../shared/components/sidebar/sidebar.component';
import { ResultTabsComponent } from '../../shared/components/result-tabs/result-tabs.component';

@Component({
  selector: 'app-plan-detail-page',
  standalone: true,
  imports: [SidebarComponent, ResultTabsComponent],
  templateUrl: './plan-detail-page.component.html',
  styleUrl: './plan-detail-page.component.css',
})
export class PlanDetailPageComponent {
  private planService    = inject(PlanService);
  private planApiService = inject(PlanApiService);
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);

  exportingPdf = signal<boolean>(false);

  private planId = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')));

  plan = computed(() => {
    const id = this.planId();
    return id ? (this.planService.getPlan(id) ?? null) : null;
  });

  activeTab = signal<string>('');
  deleting  = signal<boolean>(false);

  constructor() {
    effect(() => {
      const id = this.planId();
      if (id) this.planService.loadPlanDetail(id);
    });
    // Auto-activa 'matriz' cuando el plan carga y tiene esa tab
    effect(() => {
      const tabs = this.plan()?.resultTabs ?? [];
      if (tabs.some(t => t.id === 'matriz') && !this.activeTab()) {
        this.activeTab.set('matriz');
      }
    }, { allowSignalWrites: true });
  }

  sidebarSections = computed<SidebarSection[]>(() => {
    const t    = this.activeTab();
    const tabs = this.plan()?.resultTabs ?? [];
    const has  = (id: string) => tabs.some(tb => tb.id === id);

    return [
      {
        label: 'Plan activo',
        items: [
          { id: 'resumen',  icon: '📊', label: 'Resumen',           status: (!t || t === 'resumen')  ? 'active' : 'default' },
          ...(has('resp')    ? [{ id: 'resp',    icon: '👥', label: 'Responsabilidades', status: (t === 'resp'    ? 'active' : 'default') as 'active' | 'default' }] : []),
          ...(has('leyes')   ? [{ id: 'leyes',   icon: '⚖️', label: 'Leyes',             status: (t === 'leyes'   ? 'active' : 'default') as 'active' | 'default' }] : []),
          ...(has('brechas') ? [{ id: 'brechas', icon: '🚨', label: 'Brechas',           status: (t === 'brechas' ? 'active' : 'default') as 'active' | 'default' }] : []),
          ...(has('matriz')  ? [{ id: 'matriz',  icon: '🗃️', label: 'Matriz',            status: (t === 'matriz'  ? 'active' : 'default') as 'active' | 'default' }] : []),
        ],
      },
      {
        label: 'Acciones',
        items: [
          { id: 'sgr',        icon: '💰', label: 'Evaluar SGR'  },
          { id: 'reanalizar', icon: '🔄', label: 'Reanalizar'  },
          { id: 'exportar',   icon: '📥', label: 'Exportar PDF' },
          { id: 'rag',        icon: '🔍', label: 'Buscar RAG'   },
        ],
      },
    ];
  });

  onSidebarClick(item: SidebarItem): void {
    if (!item.id) return;
    const tabIds = ['resp', 'leyes', 'actores', 'brechas', 'matriz'];
    if (tabIds.includes(item.id)) {
      this.activeTab.set(item.id);
    } else if (item.id === 'resumen') {
      this.activeTab.set('');
    } else if (item.id === 'sgr') {
      const id = this.planId();
      if (id) this.router.navigate(['/sgr/oportunidades', id]);
    } else if (item.id === 'reanalizar') {
      this.router.navigate(['/cargar-plan']);
    } else if (item.id === 'exportar') {
      this.exportPdf();
    }
  }

  exportPdf(): void {
    const id = this.planId();
    if (!id || this.exportingPdf()) return;
    this.exportingPdf.set(true);
    this.planApiService.exportPdf(id).subscribe({
      next: (blob) => {
        const titulo = this.plan()?.title ?? 'plan';
        const filename = `analisis_${titulo.substring(0, 40).replace(/\s+/g, '_')}.pdf`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        this.exportingPdf.set(false);
      },
      error: (err) => {
        alert(`Error al exportar PDF: ${err.message}`);
        this.exportingPdf.set(false);
      },
    });
  }

  onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }

  async deletePlan(): Promise<void> {
    const id = this.planId();
    if (!id || this.deleting()) return;
    if (!confirm('¿Eliminar este plan y todos sus datos? Esta acción no se puede deshacer.')) return;
    this.deleting.set(true);
    try {
      await this.planService.deletePlan(id);
      this.router.navigate(['/biblioteca']);
    } catch {
      alert('No se pudo eliminar el plan. Intenta de nuevo.');
      this.deleting.set(false);
    }
  }

  back(): void {
    this.router.navigate(['/biblioteca']);
  }

  reanalyze(): void {
    this.router.navigate(['/cargar-plan']);
  }

  irSGR(): void {
    const id = this.planId();
    if (id) this.router.navigate(['/sgr/oportunidades', id]);
  }

  coverageColor(pct: number): string {
    if (pct >= 70) return 'var(--green)';
    if (pct >= 50) return 'var(--gold)';
    return 'var(--red)';
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
