import { computed, Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Plan, NivelTerritorial, PlanStatus, avanceColor, nivelMeta, statusMeta } from '../models/plan.model';
import { ResultTab, MatrizRow } from '../../shared/components/result-tabs/result-tabs.component';
import { PlanApiService, ApiPlanSummary, ApiPlanDetail } from './plan-api.service';
import type { BadgeVariant } from '../../shared/components/badge/badge.component';

function mk(
  p: Omit<Plan, 'nivelLabel' | 'nivelColor' | 'nivelVariant' | 'statusLabel' | 'statusVariant' | 'avanceColor'>,
): Plan {
  return { ...p, ...nivelMeta(p.nivel), ...statusMeta(p.status), avanceColor: avanceColor(p.avance) };
}

function mapEstado(estado: string): PlanStatus {
  const valid: PlanStatus[] = ['analizado', 'en-proceso', 'archivado', 'cargando', 'analizando'];
  return valid.includes(estado as PlanStatus) ? (estado as PlanStatus) : 'en-proceso';
}

function mapApiSummary(api: ApiPlanSummary): Plan {
  return mk({
    id:               api.id,
    title:            api.titulo,
    shortName:        api.nombre_corto ?? api.titulo,
    nivel:            api.nivel as NivelTerritorial,
    entityIcon:       api.entidad_icono,
    entity:           api.entidad ?? '',
    periodo:          api.periodo ?? '',
    sectors:          api.sectores.map(s => s.sector),
    responsabilidades: api.resp_total,
    leyes:            api.leyes_total,
    actores:          api.actores_total,
    brechas:          api.brechas_total,
    avance:           api.avance_pct,
    status:           mapEstado(api.estado),
    addedAt:          new Date(api.creado_en),
    description:      '',
    sectorCoverage:   api.sectores.map(s => ({
      sector: s.sector,
      icon:   s.icono ?? '📋',
      pct:    s.cobertura_pct,
    })),
  });
}

function tipoLabel(t: string): string {
  return ({ P: 'Principal', C: 'Concurrente', S: 'Subsidiario', N: 'Sin competencia' } as Record<string, string>)[t] ?? t;
}

function tipoVariant(t: string): BadgeVariant {
  return (({ P: 'green', C: 'gold', S: 'purple', N: 'gray' } as Record<string, BadgeVariant>)[t]) ?? 'gray';
}

function brechaVariant(sev: string): BadgeVariant {
  return (({ alta: 'red', media: 'gold', baja: 'gray' } as Record<string, BadgeVariant>)[sev]) ?? 'gray';
}

function mapApiDetail(api: ApiPlanDetail): Plan {
  const tabs: ResultTab[] = [];

  if (api.responsabilidades.length) {
    tabs.push({
      id: 'resp', icon: '👥', label: 'Responsabilidades', count: api.responsabilidades.length,
      items: api.responsabilidades.map(r => ({
        icon:   r.icono || '✅',
        title:  r.titulo,
        body:   r.descripcion ?? '',
        badges: [
          ...(r.referencia_legal ? [{ label: r.referencia_legal, variant: 'blue' as BadgeVariant }] : []),
          { label: tipoLabel(r.tipo), variant: tipoVariant(r.tipo) },
        ],
      })),
    });
  }

  if (api.normas.length) {
    tabs.push({
      id: 'leyes', icon: '⚖️', label: 'Leyes aplicables', count: api.normas.length,
      items: api.normas.map(n => ({
        icon:   '⚖️',
        title:  n.norma_codigo ? `${n.norma_codigo} — ${n.titulo}` : n.titulo,
        body:   n.extracto ?? '',
        badges: [
          { label: n.vigente ? 'Vigente' : 'No vigente', variant: (n.vigente ? 'green' : 'gray') as BadgeVariant },
          ...(n.advertencia ? [{ label: n.advertencia, variant: 'gold' as BadgeVariant }] : []),
        ],
      })),
    });
  }

  if (api.actores.length) {
    tabs.push({
      id: 'actores', icon: '🏛️', label: 'Actores', count: api.actores.length,
      items: api.actores.map(a => ({
        icon:   a.icono ?? '🏛️',
        title:  a.nombre,
        body:   `${a.resp_count} responsabilidades`,
        badges: a.badge_label ? [{ label: a.badge_label, variant: a.badge_variant as BadgeVariant }] : [],
      })),
    });
  }

  if (api.brechas.length) {
    tabs.push({
      id: 'brechas', icon: '🚨', label: 'Brechas', count: api.brechas.length, countVariant: 'red' as const,
      items: api.brechas.map(b => ({
        icon:   b.tipo === 'critica' ? '🚨' : '⚠️',
        title:  b.titulo,
        body:   b.descripcion ?? '',
        badges: [
          { label: b.tipo,                    variant: brechaVariant(b.severidad) },
          { label: `Severidad ${b.severidad}`, variant: brechaVariant(b.severidad) },
        ],
      })),
    });
  }

  if (api.matriz.length) {
    tabs.push({
      id: 'matriz', icon: '🗃️', label: 'Matriz de competencias', count: api.matriz.length,
      items: [],
      matrizRows: api.matriz.map(m => ({
        competencia:   m.competencia,
        leyBase:       m.ley_base ?? '',
        nacion:        m.nacion        as MatrizRow['nacion'],
        departamento:  m.departamento  as MatrizRow['departamento'],
        municipio:     m.municipio     as MatrizRow['municipio'],
        especializado: m.especializado as MatrizRow['especializado'],
        brecha:        m.brecha        as MatrizRow['brecha'],
      })),
    });
  }

  const base = mapApiSummary(api);
  return {
    ...base,
    description:  api.descripcion ?? '',
    resultTabs:   tabs.length ? tabs : undefined,
    actorDetails: api.actores.map(a => ({
      icon:         a.icono ?? '🏛️',
      name:         a.nombre,
      badgeLabel:   a.badge_label ?? '',
      badgeVariant: a.badge_variant as BadgeVariant,
      highlighted:  a.destacado,
    })),
  };
}

@Injectable({ providedIn: 'root' })
export class PlanService {
  private planApi = inject(PlanApiService);
  private _plans  = signal<Plan[]>([]);
  private _loaded = signal(false);

  readonly plans       = this._plans.asReadonly();
  readonly loaded      = this._loaded.asReadonly();
  readonly recentPlans = computed(() =>
    [...this._plans()].sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime()).slice(0, 3),
  );

  constructor() {
    this.loadFromApi();
  }

  private async loadFromApi(): Promise<void> {
    try {
      const summaries = await firstValueFrom(this.planApi.listPlanes({ limit: 200 }));
      // Always replace mock data when backend responds, even if empty
      this._plans.set(summaries.map(mapApiSummary));
    } catch {
      // backend unavailable — show empty list
    } finally {
      this._loaded.set(true);
    }
  }

  addPlan(plan: Plan): void {
    this._plans.update(current => {
      const idx = current.findIndex(p => p.id === plan.id);
      if (idx >= 0) {
        const updated = [...current];
        updated[idx] = plan;
        return updated;
      }
      return [plan, ...current];
    });
  }

  getPlan(id: string): Plan | undefined {
    return this._plans().find(p => p.id === id);
  }

  async loadPlanDetail(id: string): Promise<void> {
    try {
      const detail = await firstValueFrom(this.planApi.getPlanDetail(id));
      this.addPlan(mapApiDetail(detail));
    } catch {
      // detail unavailable — keep summary already in cache
    }
  }
}
