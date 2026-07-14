import { Component, computed, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCalendarDays, faRobot, faChartLine, faChartSimple, faSackDollar, faDownload, faRotate, faFolderOpen, faHourglassHalf, faArrowLeft, faCheckCircle, faBell, faTriangleExclamation, faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import { PlanService } from '../../core/services/plan.service';
import { PlanApiService, ApiAlertaNormativaOut } from '../../core/services/plan-api.service';
import { PlanContextService } from '../../core/services/plan-context.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../shared/components/sidebar/sidebar.component';
import { ResultTabsComponent } from '../../shared/components/result-tabs/result-tabs.component';

@Component({
  selector: 'app-plan-detail-page',
  standalone: true,
  imports: [SidebarComponent, ResultTabsComponent, FaIconComponent],
  templateUrl: './plan-detail-page.component.html',
  styleUrl: './plan-detail-page.component.css',
})
export class PlanDetailPageComponent {
  private planService    = inject(PlanService);
  private planApiService = inject(PlanApiService);
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private confirmDialog  = inject(ConfirmDialogService);
  readonly planContext    = inject(PlanContextService);

  readonly faCalendarDays = faCalendarDays;
  readonly faRobot = faRobot;
  readonly faChartLine = faChartLine;
  readonly faChartSimple = faChartSimple;
  readonly faSackDollar = faSackDollar;
  readonly faDownload = faDownload;
  readonly faRotate = faRotate;
  readonly faFolderOpen = faFolderOpen;
  readonly faHourglassHalf = faHourglassHalf;
  readonly faArrowLeft = faArrowLeft;
  readonly faCheckCircle = faCheckCircle;
  readonly faBell = faBell;
  readonly faTriangleExclamation = faTriangleExclamation;
  readonly faCheckDouble = faCheckDouble;

  exportingPdf = signal<boolean>(false);

  alertas = signal<ApiAlertaNormativaOut[]>([]);
  verificandoAlertas = signal<boolean>(false);
  marcandoLeidaIds = signal<Set<number>>(new Set());

  readonly alertasNoLeidas = computed(() => this.alertas().filter(a => !a.leida).length);

  private planId = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')));

  readonly esActivo = computed(() => !!this.planId() && this.planContext.planActivoId() === this.planId());

  marcarActivo(): void {
    const id = this.planId();
    if (id) this.planContext.seleccionar(id);
  }

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
      if (id) this.cargarAlertas(id);
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

  cargarAlertas(planId: string): void {
    this.planApiService.listarAlertas(planId).subscribe({
      next: (alertas) => this.alertas.set(alertas),
      error: () => this.alertas.set([]),
    });
  }

  verificarAlertas(): void {
    const id = this.planId();
    if (!id || this.verificandoAlertas()) return;
    this.verificandoAlertas.set(true);
    this.planApiService.verificarAlertas(id).subscribe({
      next: () => {
        this.cargarAlertas(id);
        this.verificandoAlertas.set(false);
      },
      error: (err) => {
        alert(`Error al verificar alertas: ${err.message}`);
        this.verificandoAlertas.set(false);
      },
    });
  }

  marcarAlertaLeida(alerta: ApiAlertaNormativaOut): void {
    const id = this.planId();
    if (!id || alerta.leida || this.marcandoLeidaIds().has(alerta.id)) return;
    this.marcandoLeidaIds.update(s => new Set(s).add(alerta.id));
    this.planApiService.marcarAlertasLeidas(id, [alerta.id]).subscribe({
      next: () => {
        this.alertas.update(list => list.map(a => a.id === alerta.id ? { ...a, leida: true } : a));
        this.marcandoLeidaIds.update(s => { const n = new Set(s); n.delete(alerta.id); return n; });
      },
      error: () => {
        this.marcandoLeidaIds.update(s => { const n = new Set(s); n.delete(alerta.id); return n; });
      },
    });
  }

  marcarTodasLeidas(): void {
    const id = this.planId();
    const pendientes = this.alertas().filter(a => !a.leida).map(a => a.id);
    if (!id || pendientes.length === 0) return;
    this.planApiService.marcarAlertasLeidas(id, pendientes).subscribe({
      next: () => {
        this.alertas.update(list => list.map(a => pendientes.includes(a.id) ? { ...a, leida: true } : a));
      },
      error: (err) => alert(`Error al marcar alertas como leídas: ${err.message}`),
    });
  }

  onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }

  async deletePlan(): Promise<void> {
    const id = this.planId();
    if (!id || this.deleting()) return;
    const ok = await this.confirmDialog.confirm({
      title: 'Eliminar plan',
      message: '¿Eliminar este plan y todos sus datos? Esta acción no se puede deshacer.',
    });
    if (!ok) return;
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
    if (pct >= 70) return 'var(--color-success)';
    if (pct >= 50) return 'var(--color-gold)';
    return 'var(--color-danger)';
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  severidadLabel(severidad: ApiAlertaNormativaOut['severidad']): string {
    const map: Record<ApiAlertaNormativaOut['severidad'], string> = {
      alta: 'Alta', media: 'Media', baja: 'Baja',
    };
    return map[severidad];
  }

  tipoLabel(tipo: ApiAlertaNormativaOut['tipo']): string {
    const map: Record<ApiAlertaNormativaOut['tipo'], string> = {
      modificacion: 'Modificación', derogacion: 'Derogación',
      nueva_norma: 'Nueva norma', jurisprudencia: 'Jurisprudencia',
    };
    return map[tipo];
  }
}
