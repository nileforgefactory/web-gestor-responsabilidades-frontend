import { Component, effect, input, output, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBullseye, faChartSimple, faCheck, faClipboardList, faCity,
  faDownload, faLandmark, faLocationDot, faMap, faRobot, faScaleBalanced, faScroll,
  faTemperatureHalf, faTriangleExclamation, faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { BadgeComponent, BadgeVariant } from '../badge/badge.component';
import { IconComponent } from '../icon/icon.component';

export interface ResultBadge  { label: string; variant: BadgeVariant; }
export interface ResultItem   { icon: string; title: string; body: string; badges?: ResultBadge[]; rawData?: Record<string, any>; }

export type MatrizLevel  = 'P' | 'C' | 'S' | 'N';
export type BrechaStatus = 'ok' | 'critica' | 'duplicidad' | 'indefinido';

const _ACTOR_TIPO_LABEL: Record<string, string> = {
  ejecutor: 'Ejecutor', beneficiario: 'Beneficiario', financiador: 'Financiador',
  coordinador: 'Coordinador', regulador: 'Regulador', aliado: 'Aliado',
  operador: 'Operador', supervisor: 'Supervisor', tomador_decision: 'Tomador decisión',
  participante: 'Participante', apoyo_tecnico: 'Apoyo técnico', control: 'Control', otro: 'Otro',
};
const _ACTOR_TIPO_COLOR: Record<string, string> = {
  ejecutor: '#16a34a', beneficiario: '#2563eb', financiador: '#d97706', coordinador: '#7c3aed',
  regulador: '#dc2626', aliado: '#059669', operador: '#0284c7', supervisor: '#b45309',
  tomador_decision: '#6d28d9', participante: '#6b7280', apoyo_tecnico: '#0369a1', control: '#b91c1c',
  otro: '#9ca3af',
};

export interface MatrizRow {
  competencia:        string;
  actor?:             string;
  leyBase:            string;
  nacion:             MatrizLevel;
  departamento:       MatrizLevel;
  municipio:          MatrizLevel;
  especializado:      MatrizLevel;
  brecha:             BrechaStatus;
  brechaDesc?:        string;
  sector?:            string;
  origenContexto?:    string;
  actoresVinculados?: { nombre: string; nivel: string; tipo: string }[];
  leyesVinculadas?:   { codigo: string; titulo: string }[];
}

export interface BrechaResumen {
  titulo:      string;
  descripcion: string;
  severidad:   string;
}

export interface ResumenData {
  descripcion:       string;
  respTotal:         number;
  leyesTotal:        number;
  actoresTotal:      number;
  brechasTotal:      number;
  brechasCriticas:   BrechaResumen[];
  brechasDuplicidad: BrechaResumen[];
  sectors:           { sector: string; icon: string; pct: number }[];
}

export interface ActorDetail {
  nombre: string; nivel: string; tipo: string; sector: string;
  competencias: string[];
  responsabilidades: string[]; leyes: string[];
}

export interface ResultTab {
  id: string; icon: string; label: string; count: number;
  countVariant?: BadgeVariant; items: ResultItem[]; matrizRows?: MatrizRow[];
  resumenData?: ResumenData;
}

export interface MatrizKpis {
  total: number; cobertura: number; duplicidad: number;
  sinResponsable: number; conLeyBase: number;
}

export interface SectorGroup {
  sector: string; rows: MatrizRow[];
  cubiertos: number; brechas: number; duplicidades: number;
}

export interface ActorMatrixRow {
  nombre: string; tipo: string; nivel: string;
  cells: Record<string, number>; total: number;
}

@Component({
  selector: 'app-result-tabs',
  standalone: true,
  imports: [BadgeComponent, TitleCasePipe, FaIconComponent, IconComponent],
  templateUrl: './result-tabs.component.html',
  styleUrl:    './result-tabs.component.css',
})
export class ResultTabsComponent {
  readonly faBullseye = faBullseye;
  readonly faChartSimple = faChartSimple;
  readonly faCheck = faCheck;
  readonly faClipboardList = faClipboardList;
  readonly faCity = faCity;
  readonly faDownload = faDownload;
  readonly faLandmark = faLandmark;
  readonly faLocationDot = faLocationDot;
  readonly faMap = faMap;
  readonly faRobot = faRobot;
  readonly faScaleBalanced = faScaleBalanced;
  readonly faScroll = faScroll;
  readonly faTemperatureHalf = faTemperatureHalf;
  readonly faTriangleExclamation = faTriangleExclamation;
  readonly faXmark = faXmark;

  tabs        = input<ResultTab[]>([]);
  showActions = input<boolean>(true);
  activateTab = input<string>('');

  addToPlan = output<void>();
  tabChange  = output<string>();

  activeTabId       = signal<string>('');
  selectedRow       = signal<MatrizRow | null>(null);
  selectedActor     = signal<ActorDetail | null>(null);
  heatmapView       = signal<boolean>(true);
  matrizSubView     = signal<'territorial' | 'actores'>('territorial');
  collapsedSectors  = signal<Set<string>>(new Set());
  brechaFilter      = signal<string>('');

  constructor() {
    effect(() => {
      const id = this.activateTab();
      if (id) this.activeTabId.set(id);
    }, { allowSignalWrites: true });
  }

  activeTab(): ResultTab | undefined {
    const id = this.activeTabId(), tabs = this.tabs();
    if (!id && tabs.length) return tabs[0];
    return tabs.find(t => t.id === id) ?? tabs[0];
  }

  setTab(id: string): void {
    this.activeTabId.set(id);
    this.selectedRow.set(null);
    this.selectedActor.set(null);
    this.tabChange.emit(id);
  }

  isActive(id: string): boolean { return this.activeTab()?.id === id; }

  // ── KPIs ──────────────────────────────────────────────────────────────────

  kpis(rows: MatrizRow[]): MatrizKpis {
    const total = rows.length;
    if (!total) return { total: 0, cobertura: 0, duplicidad: 0, sinResponsable: 0, conLeyBase: 0 };
    const cubiertos      = rows.filter(r => r.brecha === 'ok').length;
    const duplicidades   = rows.filter(r => r.brecha === 'duplicidad').length;
    const sinResp        = rows.filter(r => r.brecha === 'critica').length;
    const conLey         = rows.filter(r => !!r.leyBase).length;
    return {
      total,
      cobertura:       Math.round(cubiertos    / total * 100),
      duplicidad:      Math.round(duplicidades / total * 100),
      sinResponsable:  sinResp,
      conLeyBase:      Math.round(conLey       / total * 100),
    };
  }

  // ── Agrupación por sector ─────────────────────────────────────────────────

  sectorGroups(rows: MatrizRow[]): SectorGroup[] {
    const filtered = this.filteredRows(rows);
    const map = new Map<string, MatrizRow[]>();
    for (const r of filtered) {
      const s = r.sector?.trim() || 'General';
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(r);
    }
    return [...map.entries()].map(([sector, sRows]) => ({
      sector,
      rows: sRows,
      cubiertos:    sRows.filter(r => r.brecha === 'ok').length,
      brechas:      sRows.filter(r => r.brecha === 'critica').length,
      duplicidades: sRows.filter(r => r.brecha === 'duplicidad').length,
    }));
  }

  filteredRows(rows: MatrizRow[]): MatrizRow[] {
    const f = this.brechaFilter();
    if (!f) return rows;
    return rows.filter(r => r.brecha === f);
  }

  toggleSector(s: string): void {
    this.collapsedSectors.update(set => {
      const next = new Set(set);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  isSectorCollapsed(s: string): boolean { return this.collapsedSectors().has(s); }

  sectorIcon(s: string): string {
    const n = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const icons: [RegExp, string][] = [
      [/salud|hospital|medicina|sanitari/,          '🏥'],
      [/educac|escuela|colegio|instruct|formac/,    '🎓'],
      [/agua|acueducto|alcantarill|saneamiento/,    '💧'],
      [/vivienda|habitat|urbanismo|construcci/,     '🏠'],
      [/transport|vial|movilidad|carretera|via\b/,  '🛣️'],
      [/gobierno|gobernanza|administrac|alcald/,    '🏛️'],
      [/hacienda|fiscal|presupuest|financ|tribut/,  '💰'],
      [/cultura|patrimoni|artistic|biblioteca/,     '🎭'],
      [/deport|recreac|actividad.fisica|juego/,     '⚽'],
      [/tic|tecnolog|digital|comunicac|internet/,   '💻'],
      [/ambiente|ambiental|ecolog|natur|biodiv/,    '🌿'],
      [/seguridad|policia|convivencia|orden/,       '🛡️'],
      [/planeac|ordenam|territorial|urbanist/,      '📐'],
      [/juridic|legal|derecho|normativ|justicia/,   '⚖️'],
      [/agro|agricul|rural|campo|pecuari|pesca/,    '🌾'],
      [/social|bienestar|familia|infancia|mujer/,   '👨‍👩‍👧'],
      [/empleo|trabajo|laboral|productiv|empresa/,  '💼'],
      [/energia|electr|gas\b|combustible/,          '⚡'],
      [/turismo|turistic/,                          '🗺️'],
      [/mineria|miner|extrac/,                      '⛏️'],
      [/general|sin.sector|otro/,                   '📋'],
    ];
    for (const [re, icon] of icons) {
      if (re.test(n)) return icon;
    }
    return '📋';
  }

  sectorColor(s: string): string {
    const n = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (/salud/.test(n))        return '#dc2626';
    if (/educac/.test(n))       return '#2563eb';
    if (/agua/.test(n))         return '#0284c7';
    if (/vivienda/.test(n))     return '#d97706';
    if (/transport/.test(n))    return '#7c3aed';
    if (/ambiente/.test(n))     return '#059669';
    if (/seguridad/.test(n))    return '#1e40af';
    if (/hacienda|financ/.test(n)) return '#b45309';
    if (/social|bienestar/.test(n)) return '#be185d';
    if (/agro|rural/.test(n))   return '#15803d';
    return '#6b7280';
  }

  // ── Matriz de actores ─────────────────────────────────────────────────────

  actorMatrix(rows: MatrizRow[]): { actors: ActorMatrixRow[]; sectors: string[] } {
    const sectorsSet = new Set<string>();
    const actorMap   = new Map<string, ActorMatrixRow>();

    for (const row of rows) {
      const sector = row.sector?.trim() || 'General';
      sectorsSet.add(sector);
      for (const av of (row.actoresVinculados ?? [])) {
        if (!av.nombre) continue;
        if (!actorMap.has(av.nombre)) {
          actorMap.set(av.nombre, { nombre: av.nombre, tipo: av.tipo, nivel: av.nivel, cells: {}, total: 0 });
        }
        const a = actorMap.get(av.nombre)!;
        a.cells[sector] = (a.cells[sector] ?? 0) + 1;
        a.total++;
      }
    }

    const sectors = [...sectorsSet];
    const actors  = [...actorMap.values()].sort((a, b) => b.total - a.total);
    return { actors, sectors };
  }

  actorCellIntensity(count: number, max: number): string {
    if (!count || !max) return 'var(--surface2)';
    const pct = count / max;
    if (pct >= .75) return '#1d4ed8';
    if (pct >= .5)  return '#3b82f6';
    if (pct >= .25) return '#93c5fd';
    return '#dbeafe';
  }

  actorCellColor(count: number): string {
    return count ? '#fff' : 'var(--text3)';
  }

  maxActorCell(actors: ActorMatrixRow[]): number {
    return Math.max(...actors.flatMap(a => Object.values(a.cells)), 1);
  }

  // ── Helpers existentes ────────────────────────────────────────────────────

  levelClass(level: MatrizLevel): string {
    return { P: 'lvl-P', C: 'lvl-C', S: 'lvl-S', N: 'lvl-N' }[level];
  }

  levelText(level: MatrizLevel): string { return level === 'N' ? '—' : level; }

  brechaInfo(status: BrechaStatus): { text: string; cls: string } {
    if (status === 'ok')         return { text: '✓ Cubierto',    cls: 'brecha-ok'   };
    if (status === 'critica')    return { text: '🚨 Sin resp.',  cls: 'brecha-red'  };
    if (status === 'duplicidad') return { text: '⚠️ Duplicidad', cls: 'brecha-gold' };
    if (status === 'indefinido') return { text: '? Indefinido',  cls: 'brecha-gray' };
    return { text: '—', cls: '' };
  }

  heatCellClass(level: MatrizLevel, brecha: BrechaStatus): string {
    if (level === 'N') return 'heat-n';
    if (brecha === 'critica')    return 'heat-p heat-critica';
    if (brecha === 'duplicidad') return 'heat-p heat-duplicidad';
    if (brecha === 'indefinido') return 'heat-p heat-indefinido';
    return level === 'P' ? 'heat-p heat-ok' : level === 'C' ? 'heat-c heat-ok' : 'heat-s heat-ok';
  }

  heatTooltip(level: MatrizLevel, col: string, row: MatrizRow): string {
    if (level === 'N') return `${col}: sin responsabilidad`;
    const actores = (row.actoresVinculados ?? []).map(a => a.nombre).join(', ');
    return `${col}: ${level === 'P' ? 'Principal' : level === 'C' ? 'Concurrente' : 'Subsidiario'}${actores ? ' — ' + actores : ''}`;
  }

  onRowClick(row: MatrizRow): void {
    this.selectedRow.set(this.selectedRow()?.competencia === row.competencia ? null : row);
    this.selectedActor.set(null);
  }

  onActorClick(actor: { nombre: string; nivel: string; tipo: string }, row: MatrizRow, allTabs: ResultTab[]): void {
    const respTab   = allTabs.find(t => t.id === 'resp');
    const respItems = (respTab?.items ?? []).filter(item =>
      item.body.toLowerCase().includes(actor.nombre.toLowerCase().slice(0, 15))
    ).map(i => i.title).slice(0, 8);
    const leyesItems = (row.leyesVinculadas ?? []).map(l => `${l.codigo} — ${l.titulo}`);
    this.selectedActor.set({
      nombre: actor.nombre, nivel: actor.nivel, tipo: actor.tipo,
      sector: '', competencias: [],
      responsabilidades: respItems.length ? respItems : ['Sin responsabilidades mapeadas en esta competencia'],
      leyes: leyesItems.length ? leyesItems : [`Base legal: ${row.leyBase || 'No especificada'}`],
    });
  }

  onActorMatrixClick(actor: ActorMatrixRow, allTabs: ResultTab[], rows: MatrizRow[]): void {
    const respTab = allTabs.find(t => t.id === 'resp');
    const respItems = (respTab?.items ?? []).filter(i =>
      i.body.toLowerCase().includes(actor.nombre.toLowerCase().slice(0, 15))
    ).map(i => i.title).slice(0, 8);
    const leyesSet = new Set<string>();
    rows.forEach(r => {
      if ((r.actoresVinculados ?? []).some(av => av.nombre === actor.nombre)) {
        (r.leyesVinculadas ?? []).forEach(l => leyesSet.add(`${l.codigo} — ${l.titulo}`));
        if (r.leyBase) leyesSet.add(r.leyBase);
      }
    });
    this.selectedActor.set({
      nombre: actor.nombre, nivel: actor.nivel, tipo: actor.tipo,
      sector: '', competencias: [],
      responsabilidades: respItems.length ? respItems : ['Sin responsabilidades directas mapeadas'],
      leyes: leyesSet.size ? [...leyesSet].slice(0, 6) : ['Sin leyes directamente vinculadas'],
    });
  }

  onActorItemClick(item: ResultItem, allTabs: ResultTab[]): void {
    const rawData = item.rawData ?? {};
    const nombre  = rawData['nombre'] ?? item.title;
    const nivel   = rawData['nivel']  ?? '';
    const tipo    = rawData['tipo']   ?? '';
    const sector  = rawData['sector'] ?? '';
    const competenciasRaw: string[] = Array.isArray(rawData['competencias']) ? rawData['competencias'] : [];
    const respTab = allTabs.find(t => t.id === 'resp');
    const respItems = (respTab?.items ?? []).filter(i =>
      i.body.toLowerCase().includes(nombre.toLowerCase().slice(0, 15))
    ).map(i => i.title).slice(0, 8);
    const matrizTab = allTabs.find(t => t.id === 'matriz');
    const leyesSet  = new Set<string>();
    (matrizTab?.matrizRows ?? []).forEach(row => {
      (row.actoresVinculados ?? []).forEach(av => {
        if (av.nombre === nombre) {
          (row.leyesVinculadas ?? []).forEach(l => leyesSet.add(`${l.codigo} — ${l.titulo}`));
          if (row.leyBase) leyesSet.add(row.leyBase);
        }
      });
    });
    this.selectedActor.set({
      nombre, nivel, tipo, sector,
      competencias: competenciasRaw,
      responsabilidades: respItems.length ? respItems : ['Sin responsabilidades directas mapeadas'],
      leyes: leyesSet.size ? [...leyesSet].slice(0, 6) : ['Sin leyes directamente vinculadas'],
    });
  }

  actorTipoLabel(tipo: string): string { return _ACTOR_TIPO_LABEL[tipo] ?? tipo; }
  actorTipoColor(tipo: string): string { return _ACTOR_TIPO_COLOR[tipo] ?? '#9ca3af'; }

  closeDetail(): void { this.selectedRow.set(null); this.selectedActor.set(null); }

  brechaExplicacion(brecha: BrechaStatus): string {
    const map: Record<BrechaStatus, string> = {
      ok:          '',
      critica:     'No existe actor responsable asignado para ejecutar esta competencia.',
      duplicidad:  'Múltiples niveles territoriales o actores tienen responsabilidad asignada sobre la misma competencia sin coordinación definida.',
      indefinido:  'El alcance y la entidad responsable de esta competencia no están claramente establecidos en el documento.',
    };
    return map[brecha] ?? '';
  }

  nivelLabel(level: MatrizLevel): string {
    return { P: 'Principal', C: 'Concurrente', S: 'Subsidiario', N: 'No aplica' }[level];
  }

  nivelColor(level: MatrizLevel): string {
    return { P: '#1d4ed8', C: '#d97706', S: '#16a34a', N: '#9ca3af' }[level];
  }

  nivelBg(level: MatrizLevel): string {
    return { P: '#dbeafe', C: '#fef3c7', S: '#dcfce7', N: '#f3f4f6' }[level];
  }

  resumenSeveridadColor(sev: string): string {
    return ({ alta: 'var(--color-danger)', media: 'var(--color-gold)', baja: 'var(--color-success)' } as Record<string,string>)[sev] ?? 'var(--color-ink-faint)';
  }

  coverageColor(pct: number): string {
    if (pct >= 70) return 'var(--color-success)';
    if (pct >= 50) return 'var(--color-gold)';
    return 'var(--color-danger)';
  }
}
