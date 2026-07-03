import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SgrApiService } from '../../../core/services/sgr-api.service';
import { EvaluarProyectoResponse, DiagnosticoDimension } from '../../../core/models/sgr.model';

@Component({
  selector: 'app-evaluar-proyecto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './evaluar-proyecto.component.html',
  styleUrl: './evaluar-proyecto.component.css',
})
export class EvaluarProyectoComponent {
  private sgr = inject(SgrApiService);
  private fb  = inject(FormBuilder);

  loading   = signal(false);
  errorMsg  = signal<string | null>(null);
  resultado = signal<EvaluarProyectoResponse | null>(null);
  tabActiva = signal<'resumen' | 'dimensiones' | 'plan' | 'concejo'>('resumen');

  form = this.fb.group({
    texto_proyecto: ['', [Validators.required, Validators.minLength(50)]],
    plan_id:        [''],
    proyecto_id:    [''],
  });

  get charCount() { return (this.form.get('texto_proyecto')?.value ?? '').length; }

  evaluar(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.errorMsg.set(null);
    this.resultado.set(null);

    const v = this.form.value;
    this.sgr.evaluarProyecto({
      texto_proyecto: v.texto_proyecto!,
      plan_id:    v.plan_id    || null,
      proyecto_id: v.proyecto_id || null,
    }).subscribe({
      next: res => {
        this.resultado.set(res);
        this.loading.set(false);
        this.tabActiva.set('resumen');
      },
      error: err => {
        this.errorMsg.set(err.error?.detail ?? 'Error al evaluar el proyecto');
        this.loading.set(false);
      },
    });
  }

  scorePercent(d: DiagnosticoDimension): number {
    return Math.round(d.score * 100);
  }

  nivelClass(nivel: string): string {
    return `nivel-${nivel}`;
  }

  cuadranteClass(c: string): string {
    const m: Record<string,string> = {
      OPTIMO: 'verde',
      BIEN_JUSTIFICADO: 'azul',
      ATRACTIVO_CON_RIESGO: 'amarillo',
      REFORMULAR: 'rojo',
    };
    return m[c] ?? '';
  }

  cuadranteIcon(c: string): string {
    const m: Record<string,string> = {
      OPTIMO: '✅',
      BIEN_JUSTIFICADO: '📋',
      ATRACTIVO_CON_RIESGO: '⚠️',
      REFORMULAR: '🔄',
    };
    return m[c] ?? '❓';
  }

  readonly dimensiones = [
    { key: 'estructura_mga',     label: 'Estructura MGA',      icon: '📐' },
    { key: 'alineacion_plan',    label: 'Alineación al Plan',  icon: '🎯' },
    { key: 'analisis_estrategico', label: 'Análisis Estratégico', icon: '🧭' },
    { key: 'calificacion_sgr',   label: 'Calificación SGR',    icon: '✅' },
  ];

  getDimension(key: string): DiagnosticoDimension | null {
    const r = this.resultado();
    if (!r) return null;
    return (r as any)[key] as DiagnosticoDimension;
  }

  copiarAcuerdo(texto: string): void {
    navigator.clipboard.writeText(texto).catch(() => {});
  }
}
