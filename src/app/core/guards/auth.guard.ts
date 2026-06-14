import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const decide = () =>
    auth.isLoggedIn() ? true : router.createUrlTree(['/login']);

  // Si ya se inicializó (sin token o fetchMe ya terminó) decidimos de inmediato
  if (auth.initialized()) return decide();

  // Si fetchMe todavía está en vuelo esperamos a que termine
  return toObservable(auth.initialized).pipe(
    filter(Boolean),
    take(1),
    map(() => decide()),
  );
};
