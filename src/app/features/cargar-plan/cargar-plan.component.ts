import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AgentLogComponent, LogLine } from '../../shared/components/agent-log/agent-log.component';
import { SidebarComponent, SidebarItem, SidebarSection, SidebarUser } from '../../shared/components/sidebar/sidebar.component';
import { UploadZoneComponent } from '../../shared/components/upload-zone/upload-zone.component';
import { ResultTab, ResultTabsComponent } from '../../shared/components/result-tabs/result-tabs.component';
import { OrchestratorCardComponent, OrchestratorParams } from './components/orchestrator-card/orchestrator-card.component';
import { PlanService } from '../../core/services/plan.service';
import { RagApiService } from '../../core/services/rag-api.service';
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
  private ragApi      = inject(RagApiService);
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

  // ── File selected → ingest into backend ──────────────────────────────
  async onFileSelected(files: File[]): Promise<void> {
    if (!files.length) return;
    const file = files[0];
    this.selectedFile.set(file);
    this.orchestratorParams.set(null); // null = detecting
    this.state.set('file-loaded');

    try {
      const ingest = await firstValueFrom(
        this.ragApi.ingestFile(file, { collection_id: environment.planCollection }),
      );
      this.ingestDocId.set(ingest.document_id);

      this.orchestratorParams.set({
        nivel:    'Municipal',
        entidad:  file.name.replace(/\.[^.]+$/, ''),
        periodo:  '',
        sectores: [],
        actores:  [],
        depth:    'estandar',
      });
    } catch {
      this.orchestratorParams.set({
        nivel:    'Municipal',
        entidad:  file.name.replace(/\.[^.]+$/, ''),
        periodo:  '',
        sectores: [],
        actores:  [],
        depth:    'estandar',
      });
    }
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

  // ── Pipeline: real RAG queries ────────────────────────────────────────
  private async runPipeline(params: OrchestratorParams): Promise<void> {
    const file   = this.selectedFile()!;
    const collId = environment.planCollection;

    this.addLog('proc', `⚙ Orquestador iniciado — ${file.name}`);
    await this.delay(300);

    const docId = this.ingestDocId();
    if (docId) {
      this.addLog('ok', `✓ Documento indexado en base de conocimiento`);
      this.addLog('info', `→ Doc ID: ${docId.slice(0, 24)}…`);
    } else {
      this.addLog('warn', `⚠ Documento no pudo ser indexado — analizando sin contexto local`);
    }
    this.progress.set(10);

    const queries: { label: string; question: string; tabId: string; tabIcon: string; tabLabel: string }[] = [
      {
        label:    'responsabilidades',
        question: `¿Cuáles son las principales responsabilidades y competencias establecidas en este plan de desarrollo? Lista cada una con su base legal si la menciona.`,
        tabId: 'resp', tabIcon: '👥', tabLabel: 'Responsabilidades',
      },
      {
        label:    'leyes',
        question: `¿Qué leyes, decretos, resoluciones y normas se mencionan en este plan? Lista cada norma con su descripción y artículos relevantes.`,
        tabId: 'leyes', tabIcon: '⚖️', tabLabel: 'Marco legal',
      },
      {
        label:    'actores',
        question: `¿Qué entidades, instituciones o actores se identifican como responsables en este plan de desarrollo? Incluye municipios, gobernaciones, ministerios, entidades descentralizadas.`,
        tabId: 'actores', tabIcon: '🏛️', tabLabel: 'Actores',
      },
      {
        label:    'brechas',
        question: `¿Qué brechas, déficits, responsabilidades sin cobertura o competencias duplicadas se pueden identificar en este plan? ¿Hay obligaciones legales sin asignación clara?`,
        tabId: 'brechas', tabIcon: '🚨', tabLabel: 'Brechas',
      },
    ];

    const tabs: ResultTab[] = [];
    const progressStep = 18;

    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      await this.delay(200);
      this.addLog('proc', `⚙ Analizando ${q.label}…`);

      try {
        const res = await firstValueFrom(
          this.ragApi.ask({ collection_ids: [collId], user_message: q.question, top_k: 5 }),
        );

        const lines = res.answer
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 10)
          .slice(0, 6);

        tabs.push({
          id:    q.tabId,
          icon:  q.tabIcon,
          label: q.tabLabel,
          count: res.citations.length || lines.length,
          items: [
            { icon: '🤖', title: 'Síntesis del agente IA', body: res.answer.slice(0, 500), badges: [] },
            ...res.citations.slice(0, 3).map(c => ({
              icon:   '📄',
              title:  c.title ?? c.source_filename ?? c.document_id,
              body:   '',
              badges: [{ label: `Score: ${Math.round(c.score * 100)}%`, variant: 'blue' as BadgeVariant }],
            })),
          ],
        });

        this.addLog('ok', `✓ ${q.label}: ${res.citations.length} referencias encontradas`);
      } catch {
        this.addLog('warn', `⚠ No se pudo analizar ${q.label}`);
      }

      this.progress.set(10 + (i + 1) * progressStep);
    }

    this.extractedTabs.set(tabs);
    this.progress.set(100);
    this.addLog('ok', `✓ Pipeline completado · ${tabs.length} secciones analizadas`);

    await this.delay(500);
    this.state.set('done');
  }

  private addLog(type: LogLine['type'], message: string): void {
    const time = new Date().toLocaleTimeString('es-CO', { hour12: false });
    this.logs.update(l => [...l, { time: `[${time}]`, type, message }]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
