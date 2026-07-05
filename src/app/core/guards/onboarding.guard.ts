import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { SgrApiService } from '../services/sgr-api.service';
import { AuthService } from '../services/auth.service';

/**
 * Bloquea el acceso a rutas protegidas si el usuario tiene contraseña provisional
 * o no ha completado el onboarding (cambio de clave + carga de plan).
 * Redirige al paso correspondiente del onboarding.
 */
export const onboardingGuard: CanActivateFn = () => {
  const sgr    = inject(SgrApiService);
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);

  return sgr.getOnboardingStatus().pipe(
    map(status => {
      if (status.acceso_completo) return true;

      if (status.password_provisional || status.estado === 'credenciales_provisionales') {
        return router.createUrlTree(['/onboarding/cambiar-contrasena']);
      }
      if (status.estado === 'contrasena_cambiada') {
        return router.createUrlTree(['/onboarding/cargar-plan']);
      }
      if (status.estado === 'plan_cargando') {
        return router.createUrlTree(['/onboarding/cargar-plan']);
      }
      return true;
    }),
    catchError(() => of(true)), // Si falla la consulta, dejar pasar (no bloquear por error de red)
  );
};
