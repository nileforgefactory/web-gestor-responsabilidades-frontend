import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  // Tiene sesión si hay usuario cargado O si hay token (fetchMe pudo fallar por red pero el token es válido)
  const decide = () =>
    (auth.isLoggedIn() || !!auth.getToken()) ? true : router.createUrlTree(['/login']);

  if (auth.initialized()) return decide();

  return toObservable(auth.initialized).pipe(
    filter(Boolean),
    take(1),
    map(() => decide()),
  );
};
