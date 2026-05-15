import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AgentLogComponent, LogLine } from '../../shared/components/agent-log/agent-log.component';
import { SidebarComponent, SidebarItem, SidebarSection, SidebarUser } from '../../shared/components/sidebar/sidebar.component';
import { UploadZoneComponent } from '../../shared/components/upload-zone/upload-zone.component';
import { ResultTab, ResultTabsComponent } from '../../shared/components/result-tabs/result-tabs.component';
import { OrchestratorCardComponent, OrchestratorParams } from './components/orchestrator-card/orchestrator-card.component';
import { PlanService } from '../../core/services/plan.service';
import { PlanApiService, ApiPlanCreate } from '../../core/services/plan-api.service';
import { environment } from '../../../environments/environment';
import type { BadgeVariant } from '../../shared/components/badge/badge.component';

type PageState = 'idle' | 'file-loaded' | 'processing' | 'done';

@Component({
  selector: 'app-cargar-plan',
  standalone: true,
  imports: [SidebarComponent, UploadZoneComponent, OrchestratorCardComponent, AgentLogComponent, ResultTabsComponent],
  templateUrl: './cargar-plan.component.html',
  styleUrl: './cargar-plan.component.css',
})
export class CargarPlanComponent {
  private planService = inject(PlanService);
  private planApi     = inject(PlanApiService);
  private router      = inject(Router);

  state              = signal<PageState>('idle');
  selectedFile       = signal<File | null>(null);
  /** undefined = sin archivo · null = detectando · object = listo */
  orchestratorParams = signal<OrchestratorParams | null | undefined>(undefined);
  logs               = signal<LogLine[]>([]);
  progress           = signal<number>(0);
  extractedTabs      = signal<ResultTab[]>([]);
  ingestDocId        = signal<string | null>(null);
  createdPlanId      = signal<string | null>(null);

  isIdle       = computed(() => this.state() === 'idle');
  isFileLoaded = computed(() => this.state() === 'file-loaded');
  isProcessing = computed(() => this.state() === 'processing');
  isDone       = computed(() => this.state() === 'done');

  // ── Sidebar ──────────────────────────────────────────────────────────
  readonly sidebarUser: SidebarUser = {
    initials: 'AL',
    avatarColor: '#059669',
    name: 'Alc. López',
    role: 'Municipal',
    roleVariant: 'green',
  };

  sidebarSections = computed<SidebarSection[]>(() => {
    const s      = this.state();
    const recent = this.planService.recentPlans();

    const stepStatus = (step: number) => {
      const order: PageState[] = ['idle', 'file-loaded', 'processing', 'done'];
      const cur = order.indexOf(s);
      if (step < cur) return 'done' as const;
      if (step === cur) return 'active' as const;
      return 'pending' as const;
    };

    return [
      {
        label: 'Proceso',
        items: [
          { icon: '①', label: 'Cargar documento',    status: stepStatus(0) },
          { icon: '②', label: 'Configurar análisis',  status: stepStatus(1) },
          { icon: '③', label: 'Ejecutar agente',      status: stepStatus(2) },
          { icon: '④', label: 'Revisar resultados',   status: stepStatus(3) },
          { icon: '⑤', label: 'Exportar informe',     status: 'pending' },
        ],
      },
      {
        label: 'Análisis previos',
        items: recent.map(plan => ({
          id:            plan.id,
          icon:          plan.entityIcon,
          label:         plan.shortName,
          sublabel:      plan.statusLabel,
          sublabelColor: plan.avanceColor,
        })),
      },
    ];
  });

  onSidebarItemClick(item: SidebarItem): void {
    if (item.id) this.router.navigate(['/plan', item.id]);
  }

  // ── File selected → solo registra archivo, el análisis lo indexa ────
  onFileSelected(files: File[]): void {
    if (!files.length) return;
    const file = files[0];
    this.selectedFile.set(file);
    this.state.set('file-loaded');
    this.orchestratorParams.set({
      nivel:    'Municipal',
      entidad:  file.name.replace(/\.[^.]+$/, ''),
      periodo:  '',
      sectores: [],
      actores:  [],
      depth:    'estandar',
    });
  }

  // ── Orchestrator "execute" event → run real pipeline ─────────────────
  onExecute(params: OrchestratorParams): void {
    this.state.set('processing');
    this.logs.set([]);
    this.progress.set(0);
    this.extractedTabs.set([]);
    this.runPipeline(params);
  }

  // ── Save analysis as a new plan in the backend ───────────────────────
  async onAddToPlan(): Promise<void> {
    const params = this.orchestratorParams();
    if (!params) return;

    const tabs  = this.extractedTabs();
    const docId = this.ingestDocId();

    const nivelMap: Record<string, string> = {
      Municipal: 'municipal', Departamental: 'departamental',
      Nacional: 'nacional',   Sectorial: 'sectorial',
    };

    const payload: ApiPlanCreate = {
      titulo:        `Plan ${params.entidad}${params.periodo ? ' ' + params.periodo : ''}`,
      nombre_corto:  params.entidad.length > 24 ? params.entidad.slice(0, 22) + '…' : params.entidad,
      entidad:       params.entidad,
      nivel:         nivelMap[params.nivel] ?? 'municipal',
      periodo:       params.periodo || undefined,
      estado:        'en-proceso',
      qdrant_doc_id: docId ?? undefined,
      sectores:      params.sectores.map(s => ({ sector: s })),
      actores:       params.actores.map(a => ({ nombre: a })),
    };

    try {
      const created = await firstValueFrom(this.planApi.createPlan(payload));
      this.createdPlanId.set(created.id);
      await this.planService.loadPlanDetail(created.id);
      this.router.navigate(['/biblioteca']);
    } catch {
      this.router.navigate(['/biblioteca']);
    }
  }

  reset(): void {
    this.state.set('idle');
    this.selectedFile.set(null);
    this.orchestratorParams.set(undefined);
    this.logs.set([]);
    this.progress.set(0);
    this.extractedTabs.set([]);
    this.ingestDocId.set(null);
    this.createdPlanId.set(null);
  }

  // ── Pipeline: SSE streaming via analyze-document ─────────────────────
  private async runPipeline(params: OrchestratorParams): Promise<void> {
    const file = this.selectedFile()!;

    this.addLog('proc', `⚙ Orquestador iniciado — ${file.name}`);
    this.progress.set(5);

    const nivelMap: Record<string, string> = {
      Municipal: 'municipal', Departamental: 'departamental',
      Nacional: 'nacional',   Sectorial: 'sectorial',
    };

    const form = new FormData();
    form.append('file', file);
    form.append('collection_id', environment.planCollection);
    form.append('normativa_collection_ids', environment.ragCollection);
    form.append('nivel', nivelMap[params.nivel] ?? 'municipal');
    form.append('profundidad', params.depth);
    form.append('entidad', params.entidad);
    form.append('stream', 'true');
    form.append('guardar_mysql', 'false');

    let response: Response;
    try {
      response = await fetch(
        `${environment.ragApiUrl}/api/v1/analysis/analyze-document`,
        { method: 'POST', body: form },
      );
    } catch {
      this.addLog('warn', '⚠ No se pudo conectar con el servidor. Verifica que el backend esté activo.');
      this.state.set('done');
      return;
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      this.addLog('warn', `⚠ Error del servidor: ${err.detail ?? response.statusText}`);
      this.state.set('done');
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const raw = line.slice(5).trim();
          if (!raw) continue;
          try {
            this.handleSseEvent(JSON.parse(raw), params);
          } catch { /* ignorar líneas malformadas */ }
        }
      }
    } catch {
      this.addLog('warn', '⚠ Conexión SSE interrumpida');
      this.state.set('done');
    }
  }

  private handleSseEvent(event: Record<string, any>, _params: OrchestratorParams): void {
    switch (event['type']) {
      case 'log':
        this.addLog('info', event['msg'] ?? '');
        break;
      case 'indexing_done':
        this.addLog('ok', `✓ ${event['chunks']} chunks indexados en Qdrant`);
        this.progress.set(20);
        break;
      case 'agent_start':
        this.addLog('proc', `⚙ Agente ${event['agent']} iniciado…`);
        break;
      case 'agent_done':
        this.addLog('ok', `✓ ${event['agent']}: ${event['count']} elementos extraídos`);
        this.progress.update(p => Math.min(p + 15, 85));
        break;
      case 'agent_error':
        this.addLog('warn', `⚠ ${event['agent']}: ${event['error']}`);
        break;
      case 'coordinator_decision': {
        const pct = Math.round((event['confianza'] ?? 1) * 100);
        this.addLog('info', `🤖 Coordinador → ${event['accion']} (confianza: ${pct}%)`);
        if (event['razon']) this.addLog('info', `   ${event['razon']}`);
        break;
      }
      case 'saving':
        this.addLog('proc', event['msg'] ?? 'Guardando…');
        break;
      case 'heartbeat':
        break;
      case 'done':
        this.ingestDocId.set(event['result']?.['document_id'] ?? null);
        this.buildTabsFromResult(event['result']);
        this.progress.set(100);
        this.addLog('ok', '✓ Análisis completado con éxito');
        this.state.set('done');
        break;
      case 'error':
        this.addLog('warn', `⚠ Error: ${event['error']}`);
        this.state.set('done');
        break;
    }
  }

  private buildTabsFromResult(result: Record<string, any> | null | undefined): void {
    if (!result) return;

    const makeItems = (rows: any[], icon: string, titleKey = 'titulo') =>
      (rows ?? []).slice(0, 10).map((r: any) => ({
        icon,
        title:  r[titleKey] ?? r['nombre'] ?? 'Sin título',
        body:   r['descripcion'] ?? r['relevancia'] ?? '',
        badges: r['sector'] ? [{ label: r['sector'], variant: 'blue' as BadgeVariant }] : [],
      }));

    const tabs: ResultTab[] = [];

    if (result['responsabilidades']?.length)
      tabs.push({ id: 'resp',    icon: '👥', label: 'Responsabilidades', count: result['responsabilidades'].length, items: makeItems(result['responsabilidades'], '📋') });
    if (result['leyes']?.length)
      tabs.push({ id: 'leyes',   icon: '⚖️', label: 'Marco legal',       count: result['leyes'].length,           items: makeItems(result['leyes'], '📜', 'codigo') });
    if (result['actores']?.length)
      tabs.push({ id: 'actores', icon: '🏛️', label: 'Actores',           count: result['actores'].length,         items: makeItems(result['actores'], '🏢', 'nombre') });
    if (result['brechas']?.length)
      tabs.push({ id: 'brechas', icon: '🚨', label: 'Brechas',           count: result['brechas'].length,         items: makeItems(result['brechas'], '⚠️') });

    this.extractedTabs.set(tabs);
  }

  private addLog(type: LogLine['type'], message: string): void {
    const time = new Date().toLocaleTimeString('es-CO', { hour12: false });
    this.logs.update(l => [...l, { time: `[${time}]`, type, message }]);
  }
}
