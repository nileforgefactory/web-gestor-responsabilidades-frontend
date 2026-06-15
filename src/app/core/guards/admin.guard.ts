import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const rol = auth.rol();

  if (rol === 'superadmin' || rol === 'administrador') return true;

  // Token exists but MeResponse not loaded yet (app init race)
  if (!rol && auth.getToken()) return true;

  return router.createUrlTree(['/cargar-plan']);
};
