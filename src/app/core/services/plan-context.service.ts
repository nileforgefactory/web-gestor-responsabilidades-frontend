import { Injectable, computed, inject } from '@angular/core';
import { Plan } from '../models/plan.model';
import { PlanService } from './plan.service';
import { AuthService } from './auth.service';

/**
 * Fuente única de verdad para el "plan activo" seleccionado globalmente por el usuario.
 * Delega el estado real (plan_activo_id) en AuthService, que a su vez lo obtiene de MeResponse
 * y lo actualiza vía PATCH /api/v1/me/plan-activo.
 */
@Injectable({ providedIn: 'root' })
export class PlanContextService {
  private planService = inject(PlanService);
  private authService = inject(AuthService);

  /** Lista de planes disponibles (ya filtrada por territorio en el backend). */
  readonly planes = this.planService.plans;

  /** Id del plan activo del usuario, reflejando MeResponse.plan_activo_id. */
  readonly planActivoId = computed(() => this.authService.planActivoId());

  /** Objeto Plan completo correspondiente al plan activo, si está cargado en `planes()`. */
  readonly planActivo = computed<Plan | null>(() =>
    this.planes().find(p => p.id === this.planActivoId()) ?? null,
  );

  /** Fuerza la carga/recarga de los planes disponibles. */
  cargarPlanes(): void {
    this.planService.refresh();
  }

  /** Cambia el plan activo del usuario a nivel global (persistido en backend). */
  seleccionar(planId: string): void {
    this.authService.setPlanActivo(planId).subscribe({
      error: err => console.error('[PlanContext] no se pudo establecer el plan activo:', err?.status ?? err),
    });
  }
}
