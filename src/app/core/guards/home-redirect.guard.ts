import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PlanContextService } from '../services/plan-context.service';

/**
 * Redirige la ruta raíz: si el usuario ya tiene un plan activo seleccionado,
 * lo manda directo a SGR de ese plan; si no, al flujo de carga de plan.
 */
export const homeRedirectGuard: CanActivateFn = () => {
  const auth        = inject(AuthService);
  const planContext = inject(PlanContextService);
  const router      = inject(Router);

  const decide = () => {
    const planId = planContext.planActivoId();
    return planId
      ? router.createUrlTree(['/sgr/oportunidades', planId])
      : router.createUrlTree(['/cargar-plan']);
  };

  if (auth.initialized()) return decide();

  return toObservable(auth.initialized).pipe(
    filter(Boolean),
    take(1),
    map(decide),
  );
};
