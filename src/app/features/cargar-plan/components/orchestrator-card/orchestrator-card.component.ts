import { Component, input, output, signal } from '@angular/core';

export type AnalysisDepth = 'basico' | 'estandar' | 'profundo';

export interface OrchestratorParams {
  nivel: string;
  entidad: string;
  periodo: string;
  sectores: string[];
  actores: string[];
  depth: AnalysisDepth;
  maxIteraciones: number;
}

const DEFAULT_SECTORS = ['Salud', 'Educación', 'Ambiente', 'Agua', 'Vías', 'Vivienda'];

@Component({
  selector: 'app-orchestrator-card',
  standalone: true,
  imports: [],
  templateUrl: './orchestrator-card.component.html',
  styleUrl: './orchestrator-card.component.css',
})
export class OrchestratorCardComponent {
  /** null = sin archivo; undefined = detectando; object = listo */
  params     = input<OrchestratorParams | null | undefined>(undefined);
  hasFile    = input<boolean>(false);
  disabled = input<boolean>(false);

  execute = output<OrchestratorParams>();

  readonly depths: { key: AnalysisDepth; label: string; desc: string }[] = [
    { key: 'basico',    label: 'Básico',    desc: 'Solo responsabilidades' },
    { key: 'estandar',  label: 'Estándar',  desc: 'Responsabilidades + leyes + actores' },
    { key: 'profundo',  label: 'Profundo',  desc: 'Análisis completo + brechas' },
  ];

  selectedDepth      = signal<AnalysisDepth>('estandar');
  selectedMaxIter    = signal<number>(3);

  readonly maxIterOptions = [0, 1, 2, 3, 5];

  toggleSector(sector: string, params: OrchestratorParams): void {
    const idx = params.sectores.indexOf(sector);
    if (idx >= 0) params.sectores.splice(idx, 1);
    else params.sectores.push(sector);
  }

  isSectorOn(sector: string, params: OrchestratorParams): boolean {
    return params.sectores.includes(sector);
  }

  onExecute(): void {
    const p = this.params();
    if (!p) return;
    this.execute.emit({ ...p, depth: this.selectedDepth(), maxIteraciones: this.selectedMaxIter() });
  }

  readonly allSectors = DEFAULT_SECTORS;
}
