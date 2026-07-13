import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faStop, faCheck, faRotate } from '@fortawesome/free-solid-svg-icons';
import { AgentLogComponent, LogLine } from '../../shared/components/agent-log/agent-log.component';
import { SidebarComponent, SidebarItem, SidebarSection, SidebarUser } from '../../shared/components/sidebar/sidebar.component';
import { UploadZoneComponent } from '../../shared/components/upload-zone/upload-zone.component';
import { ResultTab, ResultTabsComponent } from '../../shared/components/result-tabs/result-tabs.component';
import { OrchestratorCardComponent, OrchestratorParams } from './components/orchestrator-card/orchestrator-card.component';
import { PlanService } from '../../core/services/plan.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import type { BadgeVariant } from '../../shared/components/badge/badge.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

type PageState = 'idle' | 'file-loaded' | 'processing' | 'done';

@Component({
  selector: 'app-cargar-plan',
  standalone: true,
  imports: [SidebarComponent, UploadZoneComponent, OrchestratorCardComponent, AgentLogComponent, ResultTabsComponent, IconComponent, FaIconComponent],
  templateUrl: './cargar-plan.component.html',
  styleUrl: './cargar-plan.component.css',
})
export class CargarPlanComponent {
  readonly faStop = faStop;
  readonly faCheck = faCheck;
  readonly faRotate = faRotate;

  private planService = inject(PlanService);
  private auth        = inject(AuthService);
  private router      = inject(Router);

  state              = signal<PageState>('idle');
  selectedFile       = signal<File | null>(null);
  /** undefined = sin archivo · null = detectando · object = listo */
  orchestratorParams = signal<OrchestratorParams | null | undefined>(undefined);
  logs               = signal<LogLine[]>([]);
  progress           = signal<number>(0);
  extractedTabs      = signal<ResultTab[]>([]);
  activeAnalysisTab  = signal<string>('');
  ingestDocId        = signal<string | null>(null);
  createdPlanId      = signal<string | null>(null);
  analysisResult     = signal<Record<string, any> | null>(null);

  private _sessionId: string | null = null;
  private _abortController: AbortController | null = null;

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

  /** Pasos del proceso, para el stepper horizontal siempre visible. */
  readonly procesoItems = computed(() => this.sidebarSections()[0]?.items ?? []);

  /** "Análisis previos" como sección para el overlay (solo si hay recientes). */
  readonly analisisPreviosSections = computed<SidebarSection[]>(() => {
    const sec = this.sidebarSections()[1];
    return sec && sec.items.length ? [sec] : [];
  });

  onSidebarItemClick(item: SidebarItem): void {
    if (item.id) this.router.navigate(['/plan', item.id]);
  }

  /** Vuelve al paso 1 para elegir otro documento (sin perder la sesión completa). */
  cambiarArchivo(): void {
    this.state.set('idle');
    this.selectedFile.set(null);
    this.orchestratorParams.set(undefined);
  }

  /** Tamaño legible del archivo cargado (MB). */
  fileSizeMb(file: File | null): string {
    if (!file) return '';
    return (file.size / 1024 / 1024).toFixed(1);
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
      depth:          'estandar',
      maxIteraciones: 3,
    });
  }

  // ── Orchestrator "execute" event → run real pipeline ─────────────────
  onExecute(params: OrchestratorParams): void {
    this.state.set('processing');
    this.logs.set([]);
    this.progress.set(0);
    this.extractedTabs.set([]);
    this.activeAnalysisTab.set('');
    this.runPipeline(params);
  }

  // ── Save analysis as a new plan in the backend ───────────────────────
  async onAddToPlan(): Promise<void> {
    const params = this.orchestratorParams();
    const result = this.analysisResult();

    if (!params || !result) {
      this.addLog('warn', '⚠ No hay resultado de análisis para guardar. Ejecuta primero el análisis.');
      return;
    }

    const nivelMap: Record<string, string> = {
      Municipal: 'municipal', Departamental: 'departamental',
      Nacional: 'nacional',   Sectorial: 'sectorial',
    };

    const titulo = `Plan ${params.entidad}${params.periodo ? ' ' + params.periodo : ''}`;

    // Asegurar que el payload de result contiene las listas completas (no truncadas)
    const resultPayload = {
      responsabilidades: result['responsabilidades'] ?? [],
      leyes:             result['leyes']             ?? [],
      actores:           result['actores']           ?? [],
      brechas:           result['brechas']           ?? [],
      matriz:            result['matriz']            ?? [],
    };

    const payload = {
      titulo,
      nombre_corto:   params.entidad.length > 24 ? params.entidad.slice(0, 22) + '…' : params.entidad,
      nivel:          nivelMap[params.nivel] ?? 'municipal',
      entidad:        params.entidad,
      periodo:        params.periodo || undefined,
      archivo_nombre: this.selectedFile()?.name,
      qdrant_doc_id:  this.ingestDocId() ?? undefined,
      result:         resultPayload,
    };

    this.addLog('proc', '⚙ Guardando plan en base de datos…');

    try {
      const res = await fetch(`${environment.ragApiUrl}/api/v1/analysis/save-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeader() },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        this.createdPlanId.set(data.plan_id);
        this.addLog('ok', `✓ Plan guardado — ID: ${data.plan_id}`);
        await this.planService.refresh();
        this.router.navigate(['/biblioteca']);
      } else {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        this.addLog('warn', `⚠ No se pudo guardar: ${err.detail ?? res.statusText}`);
      }
    } catch (e: any) {
      this.addLog('warn', `⚠ Error de conexión al guardar: ${e?.message ?? 'desconocido'}`);
    }
  }

  async stopAnalysis(): Promise<void> {
    // Cancela la tarea en el backend
    if (this._sessionId) {
      fetch(`${environment.ragApiUrl}/api/v1/analysis/session/${this._sessionId}/cancel`, { method: 'POST', headers: this.authHeader() })
        .catch(() => {});
    }
    // Corta la conexión SSE en el frontend
    this._abortController?.abort();
    this._sessionId = null;
    this._abortController = null;
    this.addLog('warn', '⚠ Análisis detenido por el usuario');
    this.state.set('file-loaded');
  }

  private authHeader(): Record<string, string> {
    const token = this.auth.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  reset(): void {
    this.state.set('idle');
    this.selectedFile.set(null);
    this.orchestratorParams.set(undefined);
    this.logs.set([]);
    this.progress.set(0);
    this.extractedTabs.set([]);
    this.activeAnalysisTab.set('');
    this.ingestDocId.set(null);
    this.createdPlanId.set(null);
    this._sessionId = null;
    this._abortController = null;
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

    const collectionId = this.auth.user()?.territorio.coleccion_id ?? environment.planCollection;

    const form = new FormData();
    form.append('file', file);
    form.append('collection_id', collectionId);
    form.append('normativa_collection_ids', environment.ragCollection);
    form.append('nivel', nivelMap[params.nivel] ?? 'municipal');
    form.append('profundidad', params.depth);
    form.append('entidad', params.entidad);
    form.append('max_iteraciones', String(params.maxIteraciones ?? 3));
    form.append('stream', 'true');
    form.append('guardar_mysql', 'false');

    this._abortController = new AbortController();

    let response: Response;
    try {
      response = await fetch(
        `${environment.ragApiUrl}/api/v1/analysis/analyze-document`,
        { method: 'POST', body: form, headers: this.authHeader(), signal: this._abortController.signal },
      );
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // detenido por el usuario
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
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        this.addLog('warn', '⚠ Conexión SSE interrumpida');
        this.state.set('done');
      }
    } finally {
      this._abortController = null;
    }
  }

  private handleSseEvent(event: Record<string, any>, _params: OrchestratorParams): void {
    switch (event['type']) {
      case 'session_started':
        this._sessionId = event['session_id'] ?? null;
        break;
      case 'cancelled':
        this.addLog('warn', '⚠ Análisis detenido');
        this.state.set('done');
        break;
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
        this.analysisResult.set(event['result'] ?? null);
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

    const ACTOR_TIPO_LABEL: Record<string, string> = {
      ejecutor: 'Ejecutor', beneficiario: 'Beneficiario', financiador: 'Financiador',
      coordinador: 'Coordinador', regulador: 'Regulador', aliado: 'Aliado',
      operador: 'Operador', supervisor: 'Supervisor', tomador_decision: 'Tomador decisión',
      participante: 'Participante', apoyo_tecnico: 'Apoyo técnico', control: 'Control', otro: 'Otro',
    };
    const ACTOR_TIPO_VARIANT: Record<string, BadgeVariant> = {
      ejecutor: 'green', beneficiario: 'blue', financiador: 'gold', coordinador: 'purple',
      regulador: 'red', aliado: 'green', operador: 'blue', supervisor: 'gold',
      tomador_decision: 'purple', participante: 'gray', apoyo_tecnico: 'blue', control: 'red', otro: 'gray',
    };

    const makeItems = (rows: any[], icon: string, titleKey = 'titulo') =>
      (rows ?? []).map((r: any) => ({
        icon,
        title:   r[titleKey] ?? r['nombre'] ?? 'Sin título',
        body:    r['descripcion'] ?? r['relevancia'] ?? r['competencias'] ?? '',
        badges:  r['sector'] ? [{ label: r['sector'], variant: 'blue' as BadgeVariant }] : [],
        rawData: r,
      }));

    const makeActorItems = (rows: any[]) =>
      (rows ?? []).map((r: any) => ({
        icon:    '🏛️',
        title:   r['nombre'] ?? 'Sin nombre',
        body:    r['competencias'] ?? r['descripcion'] ?? '',
        badges:  [
          { label: ACTOR_TIPO_LABEL[r['tipo']] ?? r['tipo'] ?? 'Otro', variant: (ACTOR_TIPO_VARIANT[r['tipo']] ?? 'gray') as BadgeVariant },
          ...(r['nivel'] ? [{ label: r['nivel'], variant: 'blue' as BadgeVariant }] : []),
        ],
        rawData: r,
      }));

    const tabs: ResultTab[] = [];

    if (result['responsabilidades']?.length)
      tabs.push({ id: 'resp',    icon: '👥', label: 'Responsabilidades', count: result['responsabilidades'].length, items: makeItems(result['responsabilidades'], '📋') });
    if (result['leyes']?.length)
      tabs.push({ id: 'leyes',   icon: '⚖️', label: 'Marco legal',       count: result['leyes'].length,           items: makeItems(result['leyes'], '📜', 'codigo') });
    if (result['actores']?.length)
      tabs.push({ id: 'actores', icon: '🏛️', label: 'Actores',           count: result['actores'].length,         items: makeActorItems(result['actores']) });
    if (result['brechas']?.length)
      tabs.push({ id: 'brechas', icon: '🚨', label: 'Brechas', count: result['brechas'].length, countVariant: 'red' as BadgeVariant, items: makeItems(result['brechas'], '⚠️') });
    if (result['matriz']?.length)
      tabs.push({
        id: 'matriz', icon: '📐', label: 'Matriz', count: result['matriz'].length, items: [],
        matrizRows: (result['matriz'] as any[]).map(r => ({
          competencia:      r['competencia']       ?? '',
          leyBase:          r['ley_base']           ?? '',
          nacion:           r['nacion']             ?? 'N',
          departamento:     r['departamento']       ?? 'N',
          municipio:        r['municipio']          ?? 'N',
          especializado:    r['especializado']      ?? 'N',
          brecha:           r['brecha']             ?? 'ok',
          sector:           r['sector']             ?? '',
          actoresVinculados: (r['actores_vinculados'] ?? []).map((a: any) => ({
            nombre: a['nombre'] ?? '',
            nivel:  a['nivel']  ?? '',
            tipo:   a['tipo']   ?? '',
          })),
          leyesVinculadas: (r['leyes_vinculadas'] ?? []).map((l: any) => ({
            codigo: l['codigo'] ?? '',
            titulo: l['titulo'] ?? '',
          })),
        })),
      });

    this.extractedTabs.set(tabs);
    // Auto-activate matriz tab if present so the heat map is immediately visible
    if (tabs.some(t => t.id === 'matriz')) {
      this.activeAnalysisTab.set('matriz');
    }
  }

  private addLog(type: LogLine['type'], message: string): void {
    const time = new Date().toLocaleTimeString('es-CO', { hour12: false });
    this.logs.update(l => [...l, { time: `[${time}]`, type, message }]);
  }
}
