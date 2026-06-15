import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  SidebarComponent,
  SidebarItem,
  SidebarSection,
  SidebarUser,
} from '../../shared/components/sidebar/sidebar.component';
import {
  FilterType,
  FILTER_OPTIONS,
  NormaType,
  RagResult,
  RagSynthesis,
  RagState,
  SEARCH_SUGGESTIONS,
} from '../../core/models/rag.model';
import { BadgeVariant } from '../../shared/components/badge/badge.component';
import { PlanService } from '../../core/services/plan.service';
import { RagApiService, HealthReadyResponse } from '../../core/services/rag-api.service';
import { PlanApiService, ApiConocimientoOut } from '../../core/services/plan-api.service';
import { environment } from '../../../environments/environment';
import { SearchInputComponent } from './components/search-input/search-input.component';
import { RagResultCardComponent } from './components/rag-result-card/rag-result-card.component';
import { AiSynthesisCardComponent } from './components/ai-synthesis-card/ai-synthesis-card.component';

@Component({
  selector: 'app-busqueda-raag',
  standalone: true,
  imports: [
    SidebarComponent,
    SearchInputComponent,
    RagResultCardComponent,
    AiSynthesisCardComponent,
  ],
  templateUrl: './busqueda-raag.component.html',
  styleUrl: './busqueda-raag.component.css',
})
export class BusquedaRaagComponent implements OnInit {
  private planService = inject(PlanService);
  private ragApi      = inject(RagApiService);
  private planApi     = inject(PlanApiService);
  private router      = inject(Router);

  state        = signal<RagState>('idle');
  currentQuery = signal<string>('');
  results      = signal<RagResult[]>([]);
  synthesis    = signal<RagSynthesis | null>(null);
  activeFilter = signal<FilterType>('all');
  queryHistory = signal<string[]>([]);
  totalHits    = signal<number>(0);
  errorMsg     = signal<string | null>(null);
  health       = signal<HealthReadyResponse | null>(null);

  // ── Base de conocimiento ──────────────────────────────────────────────────
  conocimientos      = signal<ApiConocimientoOut[]>([]);
  conocimientoFilter = signal<'todos' | 'indexado' | 'deshabilitado'>('todos');
  togglingId         = signal<string | null>(null);
  showConocimiento   = signal(true);

  readonly suggestions   = SEARCH_SUGGESTIONS;
  readonly filterOptions = FILTER_OPTIONS;
  readonly collectionId  = environment.ragCollection;

  isIdle     = computed(() => this.state() === 'idle');
  isQuerying = computed(() => this.state() === 'querying');
  isDone     = computed(() => this.state() === 'done');

  activePlan = computed(() => this.planService.recentPlans()[0] ?? null);

  filteredResults = computed(() => {
    const filter = this.activeFilter();
    const results = this.results();
    return filter === 'all' ? results : results.filter(r => r.type === filter);
  });

  filteredConocimientos = computed(() => {
    const f = this.conocimientoFilter();
    const docs = this.conocimientos();
    if (f === 'todos') return docs;
    return docs.filter(d => d.estado === f);
  });

  // ── Sidebar ──────────────────────────────────────────────────────────────
  readonly sidebarUser: SidebarUser = {
    initials: 'AL',
    avatarColor: '#059669',
    name: 'Alc. López',
    role: 'Municipal',
    roleVariant: 'green',
  };

  sidebarSections = computed<SidebarSection[]>(() => {
    const activeFilter = this.activeFilter();
    const history      = this.queryHistory();
    const plan         = this.activePlan();
    const h            = this.health();
    const docs         = this.conocimientos();

    const icon  = (ok: boolean | undefined) => ok ? '✅' : ok === false ? '❌' : '🔄';
    const label = (ok: boolean | undefined) => ok ? 'Online' : ok === false ? 'Offline' : 'Verificando…';
    const color = (ok: boolean | undefined) => ok ? 'var(--green)' : h ? 'var(--red)' : 'var(--gold)';

    const indexados      = docs.filter(d => d.estado === 'indexado').length;
    const deshabilitados = docs.filter(d => d.estado === 'deshabilitado').length;

    const sections: SidebarSection[] = [
      {
        label: 'Estado del servicio',
        items: [
          { icon: icon(h?.healthy),                          label: 'API RAG',            sublabel: label(h?.healthy),                          sublabelColor: color(h?.healthy) },
          { icon: icon(h?.checks?.qdrant?.reachable),        label: 'Vector DB (Qdrant)', sublabel: label(h?.checks?.qdrant?.reachable),        sublabelColor: color(h?.checks?.qdrant?.reachable) },
          { icon: icon(h?.checks?.ollama?.daemon_reachable), label: 'Modelo IA (Ollama)', sublabel: label(h?.checks?.ollama?.daemon_reachable), sublabelColor: color(h?.checks?.ollama?.daemon_reachable) },
        ],
      },
      {
        label: 'Base de conocimiento',
        items: [
          { icon: '📄', label: 'Total documentos', badge: docs.length },
          { icon: '✅', label: 'Activos',          badge: indexados },
          { icon: '🚫', label: 'Deshabilitados',   badge: deshabilitados },
        ],
      },
      {
        label: 'Filtros de búsqueda',
        items: FILTER_OPTIONS.map(f => ({
          id:     `filter:${f.type}`,
          icon:   f.icon,
          label:  f.label,
          status: f.type === activeFilter ? ('active' as const) : undefined,
        })),
      },
    ];

    if (history.length) {
      sections.push({
        label: 'Historial',
        items: history.map(q => ({ id: `history:${q}`, icon: '🔍', label: q })),
      });
    }

    if (plan) {
      sections.push({
        label: 'Plan activo',
        items: [{
          id:            plan.id,
          icon:          plan.entityIcon,
          label:         plan.shortName,
          sublabel:      `${plan.leyes} leyes · ${plan.brechas} brechas`,
          sublabelColor: plan.avanceColor,
        }],
      });
    }

    return sections;
  });

  ngOnInit(): void {
    this.ragApi.healthReady().subscribe({
      next:  h  => this.health.set(h),
      error: () => this.health.set({ app_env: '', healthy: false, checks: {} }),
    });
    this.loadConocimientos();
  }

  onSidebarItemClick(item: SidebarItem): void {
    const id = item.id ?? '';
    if (id.startsWith('filter:')) { this.activeFilter.set(id.replace('filter:', '') as FilterType); return; }
    if (id.startsWith('history:')) { this.onSearch(id.replace('history:', '')); return; }
    if (id) this.router.navigate(['/plan', id]);
  }

  // ── Conocimiento ──────────────────────────────────────────────────────────

  loadConocimientos(): void {
    this.planApi.listConocimiento({ limit: 500 }).subscribe({
      next: docs => this.conocimientos.set(docs),
      error: () => {},
    });
  }

  toggleConocimiento(doc: ApiConocimientoOut): void {
    if (this.togglingId()) return;
    this.togglingId.set(doc.id);

    const accion$ = doc.estado === 'deshabilitado'
      ? this.planApi.habilitarConocimiento(doc.id)
      : this.planApi.deshabilitarConocimiento(doc.id);

    accion$.subscribe({
      next: updated => {
        this.conocimientos.update(docs => docs.map(d => d.id === updated.id ? updated : d));
        this.togglingId.set(null);
      },
      error: () => this.togglingId.set(null),
    });
  }

  // ── Search ────────────────────────────────────────────────────────────────

  onSearch(query: string): void {
    if (!query.trim() || this.isQuerying()) return;

    this.currentQuery.set(query);
    this.state.set('querying');
    this.results.set([]);
    this.synthesis.set(null);
    this.errorMsg.set(null);
    this.totalHits.set(0);
    this.activeFilter.set('all');

    this.queryHistory.update(h => [query, ...h.filter(q => q !== query)].slice(0, 5));
    this.runSearch(query);
  }

  onViewMatrix(): void { this.router.navigate(['/biblioteca']); }
  onExportAnalysis(): void { /* placeholder */ }

  reset(): void {
    this.state.set('idle');
    this.currentQuery.set('');
    this.results.set([]);
    this.synthesis.set(null);
    this.errorMsg.set(null);
    this.totalHits.set(0);
    this.activeFilter.set('all');
  }

  // ── API ───────────────────────────────────────────────────────────────────

  private async runSearch(query: string): Promise<void> {
    try {
      const askRes = await firstValueFrom(this.ragApi.ask({
        collection_ids: [this.collectionId],
        user_message:   query,
        top_k:          5,
      }));

      this.totalHits.set(askRes.citations.length);
      this.results.set(askRes.citations.map(c => this.citationToRagResult(c)));
      this.synthesis.set({ text: askRes.answer, sourceCount: askRes.citations.length });
      this.state.set('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexión con el servicio RAG';
      this.errorMsg.set(msg);
      this.state.set('idle');
    }
  }

  private citationToRagResult(c: { chunk_id: string; document_id: string; score: number; title: string | null; source_filename: string | null }): RagResult {
    const name = c.title ?? c.source_filename ?? c.document_id;
    const { type, typeLabel, badgeVariant } = this.inferNormaType(name);
    return {
      id:               c.chunk_id,
      type,
      typeLabel,
      typeBadgeVariant: badgeVariant,
      title:            name,
      articles:         '',
      excerpt:          c.source_filename ? `Fuente: ${c.source_filename}` : '',
      relevance:        Math.round(c.score * 100),
      vigente:          true,
      badges:           [{ label: `Score ${Math.round(c.score * 100)}%`, variant: 'blue' as BadgeVariant }],
    };
  }

  private inferNormaType(name: string): { type: NormaType; typeLabel: string; badgeVariant: BadgeVariant } {
    const n = name.toLowerCase();
    if (n.includes('ley'))                               return { type: 'ley',        typeLabel: 'Ley',        badgeVariant: 'blue'   };
    if (n.includes('decreto') || n.includes('dec_'))    return { type: 'decreto',    typeLabel: 'Decreto',    badgeVariant: 'purple' };
    if (n.includes('resolucion') || n.includes('res_')) return { type: 'resolucion', typeLabel: 'Resolución', badgeVariant: 'gold'   };
    if (n.includes('circular'))                          return { type: 'circular',   typeLabel: 'Circular',   badgeVariant: 'green'  };
    return { type: 'otro', typeLabel: 'Documento', badgeVariant: 'gray' };
  }

  estadoLabel(estado: string): string {
    const m: Record<string, string> = {
      indexado: 'Activo', deshabilitado: 'Deshabilitado',
      procesando: 'Procesando', pendiente: 'Pendiente', error: 'Error',
    };
    return m[estado] ?? estado;
  }
}
