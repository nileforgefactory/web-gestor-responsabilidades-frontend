import { Component, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFileLines, faTriangleExclamation, faCircleCheck, faScroll, faPaperclip, faXmark } from '@fortawesome/free-solid-svg-icons';
import { SgrApiService } from '../../../core/services/sgr-api.service';
import { EvaluarProyectoResponse, DiagnosticoDimension } from '../../../core/models/sgr.model';
import { PlanContextService } from '../../../core/services/plan-context.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-evaluar-proyecto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent, IconComponent],
  templateUrl: './evaluar-proyecto.component.html',
  styleUrl: './evaluar-proyecto.component.css',
})
export class EvaluarProyectoComponent {
  private sgr      = inject(SgrApiService);
  private fb       = inject(FormBuilder);
  private route    = inject(ActivatedRoute);
  private location = inject(Location);
  readonly planContext = inject(PlanContextService);

  readonly faFileLines = faFileLines;
  readonly faTriangleExclamation = faTriangleExclamation;
  readonly faCircleCheck = faCircleCheck;
  readonly faScroll = faScroll;
  readonly faPaperclip = faPaperclip;
  readonly faXmark = faXmark;

  loading   = signal(false);
  errorMsg  = signal<string | null>(null);
  resultado = signal<EvaluarProyectoResponse | null>(null);
  tabActiva = signal<'resumen' | 'dimensiones' | 'plan' | 'concejo'>('resumen');

  /** El formulario de texto libre queda oculto hasta que el usuario decide crear un proyecto,
   * salvo que llegue con la intención ya explícita (?crear=1) desde el botón de Oportunidades. */
  mostrarFormulario = signal(this.route.snapshot.queryParamMap.get('crear') === '1');

  // Archivo adjunto (opcional) — su texto extraído se agrega al mensaje
  archivoNombre  = signal<string | null>(null);
  extrayendoArchivo = signal(false);

  form = this.fb.group({
    texto_proyecto: ['', [Validators.required, Validators.minLength(50)]],
  });

  constructor() {
    this.planContext.cargarPlanes();
  }

  get charCount() { return (this.form.get('texto_proyecto')?.value ?? '').length; }

  volver(): void {
    this.location.back();
  }

  crearProyecto(): void {
    this.mostrarFormulario.set(true);
  }

  cancelarCreacion(): void {
    this.mostrarFormulario.set(false);
    this.form.reset();
    this.archivoNombre.set(null);
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.extrayendoArchivo.set(true);
    this.errorMsg.set(null);

    this.sgr.extraerTextoDocumento(file).subscribe({
      next: res => {
        const actual = this.form.get('texto_proyecto')?.value ?? '';
        const separador = actual.trim() ? '\n\n' : '';
        this.form.get('texto_proyecto')?.setValue(
          `${actual}${separador}--- Contenido de ${res.nombre_archivo} ---\n${res.texto}`,
        );
        this.archivoNombre.set(res.nombre_archivo);
        this.extrayendoArchivo.set(false);
        input.value = '';
      },
      error: err => {
        this.errorMsg.set(err.error?.detail ?? 'No se pudo extraer el texto del archivo');
        this.extrayendoArchivo.set(false);
        input.value = '';
      },
    });
  }

  quitarArchivo(): void {
    this.archivoNombre.set(null);
  }

  evaluar(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.errorMsg.set(null);
    this.resultado.set(null);

    const v = this.form.value;
    this.sgr.evaluarProyecto({
      texto_proyecto: v.texto_proyecto!,
      plan_id: this.planContext.planActivoId() || null,
      proyecto_id: null,
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
