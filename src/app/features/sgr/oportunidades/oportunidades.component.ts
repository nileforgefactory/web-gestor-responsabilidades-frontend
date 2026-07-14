import { Component, OnInit, inject, signal, computed, input } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faClipboardList, faRocket, faTriangleExclamation, faArrowLeft, faCircleCheck, faFileLines } from '@fortawesome/free-solid-svg-icons';
import { SgrApiService } from '../../../core/services/sgr-api.service';
import { EvaluarPlanResponse, ProyectoCandidato } from '../../../core/models/sgr.model';

@Component({
  selector: 'app-oportunidades',
  standalone: true,
  imports: [CommonModule, RouterLink, FaIconComponent],
  templateUrl: './oportunidades.component.html',
  styleUrl: './oportunidades.component.css',
})
export class OportunidadesComponent implements OnInit {
  private sgr      = inject(SgrApiService);
  private location = inject(Location);
  private router   = inject(Router);

  readonly faClipboardList = faClipboardList;
  readonly faRocket = faRocket;
  readonly faTriangleExclamation = faTriangleExclamation;
  readonly faArrowLeft = faArrowLeft;
  readonly faCircleCheck = faCircleCheck;
  readonly faFileLines = faFileLines;

  planId = input.required<string>();

  ngOnInit(): void {
    this.evaluar();
  }

  volver(): void {
    this.location.back();
  }

  crearProyecto(): void {
    this.router.navigate(['/sgr/evaluar-proyecto'], { queryParams: { crear: '1' } });
  }

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
