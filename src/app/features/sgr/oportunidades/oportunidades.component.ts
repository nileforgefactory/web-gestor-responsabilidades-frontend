import { Component, inject, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SgrApiService } from '../../../core/services/sgr-api.service';
import { EvaluarPlanResponse, ProyectoCandidato } from '../../../core/models/sgr.model';

@Component({
  selector: 'app-oportunidades',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './oportunidades.component.html',
  styleUrl: './oportunidades.component.css',
})
export class OportunidadesComponent {
  private sgr = inject(SgrApiService);

  planId = input.required<string>();

  loading  = signal(false);
  errorMsg = signal<string | null>(null);
  resultado = signal<EvaluarPlanResponse | null>(null);

  soloElegibles = signal(false);
  topN          = signal(10);

  readonly candidatos = computed(() =>
    this.resultado()?.proyectos_candidatos ?? [],
  );

  readonly resumen = computed(() => {
    const r = this.resultado();
    if (!r) return null;
    return {
      total:      r.total_brechas,
      elegibles:  r.total_elegibles,
      noElegibles: r.total_no_elegibles,
      pct: r.total_brechas > 0
        ? Math.round((r.total_elegibles / r.total_brechas) * 100)
        : 0,
    };
  });

  evaluar(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    this.sgr.evaluarPlan(this.planId(), {
      topN: this.topN(),
      soloElegibles: this.soloElegibles(),
    }).subscribe({
      next: res => {
        this.resultado.set(res);
        this.loading.set(false);
      },
      error: err => {
        this.errorMsg.set(err.error?.detail ?? 'Error al evaluar el plan');
        this.loading.set(false);
      },
    });
  }

  scoreBar(score: number): string {
    return `${Math.round(score * 100)}%`;
  }

  semaforoClass(semaforo: string): string {
    return `semaforo-${semaforo}`;
  }

  semaforoIcon(semaforo: string): string {
    return semaforo === 'verde' ? '🟢' : semaforo === 'amarillo' ? '🟡' : '🔴';
  }

  severidadClass(sev: string): string {
    return `sev-${sev}`;
  }
}
