import { Component, OnInit, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SgrApiService } from '../../../core/services/sgr-api.service';
import { FichaMGAOut } from '../../../core/models/sgr.model';

@Component({
  selector: 'app-ficha-proyecto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ficha-proyecto.component.html',
  styleUrl: './ficha-proyecto.component.css',
})
export class FichaProyectoComponent implements OnInit {
  private sgr = inject(SgrApiService);

  proyectoId = input.required<string>();

  loading   = signal(false);
  errorMsg  = signal<string | null>(null);
  ficha     = signal<FichaMGAOut | null>(null);
  tabActiva = signal<'identificacion' | 'preparacion' | 'evaluacion' | 'programacion'>('identificacion');

  ngOnInit(): void {
    this.cargarFicha(false);
  }

  cargarFicha(forzar: boolean): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    this.sgr.generarFichaMGA(this.proyectoId(), { forzar_regeneracion: forzar }).subscribe({
      next: f => { this.ficha.set(f); this.loading.set(false); },
      error: err => {
        this.errorMsg.set(err.error?.detail ?? 'Error al generar la Ficha MGA');
        this.loading.set(false);
      },
    });
  }

  copiarSeccion(texto: string | null): void {
    if (texto) navigator.clipboard.writeText(texto).catch(() => {});
  }

  readonly secciones = [
    { key: 'identificacion' as const, label: 'Identificación', icon: '🔍', num: '1' },
    { key: 'preparacion'   as const, label: 'Preparación',    icon: '📐', num: '2' },
    { key: 'evaluacion'    as const, label: 'Evaluación',     icon: '📊', num: '3' },
    { key: 'programacion'  as const, label: 'Programación',   icon: '📅', num: '4' },
  ];

  getSeccion(key: string): string | null {
    const f = this.ficha();
    if (!f) return null;
    return (f as any)[key] ?? null;
  }

  completadoClass(): string {
    const c = this.ficha()?.campos_completos ?? 0;
    if (c === 4) return 'completo';
    if (c >= 2)  return 'parcial';
    return 'minimo';
  }
}
