import { Component, computed, effect, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { NavbarComponent, NavItem } from './shared/components/navbar/navbar.component';
import { AuthService } from './core/services/auth.service';
import { PlanContextService } from './core/services/plan-context.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly auth        = inject(AuthService);
  readonly planContext = inject(PlanContextService);
  private  router      = inject(Router);

  constructor() {
    // Si la sesión inicializó pero el usuario sigue nulo (fetchMe falló), reintenta.
    effect(() => {
      if (this.auth.initialized() && !this.auth.user() && !!this.auth.getToken()) {
        this.auth.reloadUser();
      }
    });
  }

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly showNavbar = computed(() => !this.currentUrl().startsWith('/login'));

  readonly navItems = computed<NavItem[]>(() => {
    const rol = this.auth.rol();
    const planActivoId = this.planContext.planActivoId();
    const rutaSgr = planActivoId ? `/sgr/oportunidades/${planActivoId}` : '/sgr/evaluar-proyecto';
    const items: NavItem[] = [
      { label: 'Cargar Plan',          route: '/cargar-plan',          icon: '📂', highlighted: true },
      { label: 'Biblioteca',           route: '/biblioteca',           icon: '📚' },
      { label: 'SGR',                  route: rutaSgr,                 icon: '💰' },
      { label: 'Mis Proyectos SGR',    route: '/sgr/mis-proyectos',    icon: '📁' },
      { label: 'Búsqueda RAG',         route: '/busqueda-raag',        icon: '🔍' },
      { label: 'Base de Conocimiento', route: '/base-conocimiento',    icon: '⚡' },
    ];
    if (rol === 'superadmin' || rol === 'administrador') {
      items.push({ label: 'Usuarios', route: '/admin/usuarios', icon: '👥' });
      items.push({ label: 'Matriz SGR', route: '/admin/sgr-matriz', icon: '📊' });
    }
    return items;
  });

  logout(): void {
    this.auth.logout();
  }
}
