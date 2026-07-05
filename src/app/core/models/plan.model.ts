import { BadgeVariant } from '../../shared/components/badge/badge.component';
import { ResultTab } from '../../shared/components/result-tabs/result-tabs.component';

export type NivelTerritorial = 'nacional' | 'departamental' | 'municipal' | 'sectorial';
export type PlanStatus       = 'analizado' | 'en-proceso' | 'archivado' | 'cargando' | 'analizando';

export interface SectorCoverage {
  sector: string;
  icon:   string;
  pct:    number;
}

export interface ActorDetail {
  icon:          string;
  name:          string;
  badgeLabel:    string;
  badgeVariant:  BadgeVariant;
  highlighted?:  boolean;
}

export interface Plan {
  id:               string;
  title:            string;
  shortName:        string;
  nivel:            NivelTerritorial;
  nivelLabel:       string;
  nivelColor:       string;
  nivelVariant:     BadgeVariant;
  entityIcon:       string;
  entity:           string;
  periodo:          string;
  sectors:          string[];
  responsabilidades: number;
  leyes:            number;
  actores:          number;
  brechas:          number;
  avance:           number;
  avanceColor:      string;
  status:           PlanStatus;
  statusLabel:      string;
  statusVariant:    BadgeVariant;
  addedAt:          Date;
  description:      string;
  resultTabs?:      ResultTab[];
  sectorCoverage?:  SectorCoverage[];
  actorDetails?:    ActorDetail[];
}

/* ── helpers ── */
export function nivelMeta(nivel: NivelTerritorial): Pick<Plan, 'nivelLabel' | 'nivelColor' | 'nivelVariant'> {
  const map: Record<NivelTerritorial, Pick<Plan, 'nivelLabel' | 'nivelColor' | 'nivelVariant'>> = {
    nacional:       { nivelLabel: 'Nacional',       nivelColor: '#3B82F6', nivelVariant: 'blue'   },
    departamental:  { nivelLabel: 'Departamental',  nivelColor: '#059669', nivelVariant: 'green'  },
    municipal:      { nivelLabel: 'Municipal',       nivelColor: '#F59E0B', nivelVariant: 'gold'   },
    sectorial:      { nivelLabel: 'Sectorial',       nivelColor: '#8B5CF6', nivelVariant: 'purple' },
  };
  return map[nivel];
}

export function avanceColor(pct: number): string {
  if (pct >= 70) return 'var(--color-success)';
  if (pct >= 50) return 'var(--color-gold)';
  return 'var(--color-danger)';
}

export function statusMeta(status: PlanStatus): Pick<Plan, 'statusLabel' | 'statusVariant'> {
  const map: Record<PlanStatus, Pick<Plan, 'statusLabel' | 'statusVariant'>> = {
    analizado:    { statusLabel: '✅ Analizado',   statusVariant: 'green'  },
    'en-proceso': { statusLabel: '🔄 En proceso',  statusVariant: 'blue'   },
    archivado:    { statusLabel: 'Archivado',       statusVariant: 'gray'   },
    cargando:     { statusLabel: '⏳ Cargando',     statusVariant: 'gold'   },
    analizando:   { statusLabel: '🔍 Analizando',   statusVariant: 'purple' },
  };
  return map[status];
}
