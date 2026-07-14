import { Component, computed, effect, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { RailSidebarComponent, RailGroup } from './shared/components/rail-sidebar/rail-sidebar.component';
import { TopbarComponent } from './shared/components/topbar/topbar.component';
import { AuthService } from './core/services/auth.service';
import { PlanContextService } from './core/services/plan-context.service';
import { LayoutService } from './core/services/layout.service';

interface PageMeta {
  eyebrow: string;
  title: string;
}

/** Prefijo de ruta -> metadatos de encabezado (eyebrow + título). Orden: más específico primero. */
const PAGE_META: Array<{ prefix: string; meta: PageMeta }> = [
  { prefix: '/sgr/evaluar-proyecto', meta: { eyebrow: 'Crear propuesta SGR', title: 'Evaluar proyecto' } },
  { prefix: '/sgr/mis-proyectos',    meta: { eyebrow: 'Crear propuesta SGR', title: 'Mis proyectos SGR' } },
  { prefix: '/sgr/oportunidades',    meta: { eyebrow: 'Crear propuesta SGR', title: 'Oportunidades del plan' } },
  { prefix: '/sgr/ficha-mga',        meta: { eyebrow: 'Crear propuesta SGR', title: 'Ficha MGA del proyecto' } },
  { prefix: '/sgr/duplicidad',       meta: { eyebrow: 'Crear propuesta SGR', title: 'Verificación de duplicidad' } },
  { prefix: '/cargar-plan',          meta: { eyebrow: 'Planes de desarrollo', title: 'Cargar plan' } },
  { prefix: '/biblioteca',           meta: { eyebrow: 'Planes de desarrollo', title: 'Biblioteca de planes' } },
  { prefix: '/plan/',                meta: { eyebrow: 'Planes de desarrollo', title: 'Detalle del plan' } },
  { prefix: '/busqueda-raag',        meta: { eyebrow: 'Conocimiento', title: 'Búsqueda RAG' } },
  { prefix: '/base-conocimiento',    meta: { eyebrow: 'Conocimiento', title: 'Base de conocimiento' } },
  { prefix: '/admin/usuarios',       meta: { eyebrow: 'Administración', title: 'Usuarios' } },
  { prefix: '/admin/sgr-matriz',     meta: { eyebrow: 'Administración', title: 'Matriz de proyectos' } },
  { prefix: '/admin/normas',         meta: { eyebrow: 'Administración', title: 'Normas del indexer' } },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RailSidebarComponent, TopbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly auth        = inject(AuthService);
  readonly planContext = inject(PlanContextService);
  readonly layout      = inject(LayoutService);
  private  router      = inject(Router);

  constructor() {
    // Si la sesión inicializó pero el usuario sigue nulo (fetchMe falló), reintenta.
    effect(() => {
      if (this.auth.initialized() && !this.auth.user() && !!this.auth.getToken()) {
        this.auth.reloadUser();
      }
    });

    // El chip "Plan activo" de la topbar necesita la lista de planes cargada.
    this.planContext.cargarPlanes();
  }

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** El shell (riel + topbar) se oculta en login y onboarding para un flujo enfocado. */
  readonly showShell = computed(() => {
    const url = this.currentUrl();
    return !url.startsWith('/login') && !url.startsWith('/onboarding');
  });

  readonly pageMeta = computed<PageMeta>(() => {
    const url = this.currentUrl();
    return PAGE_META.find(p => url.startsWith(p.prefix))?.meta
      ?? { eyebrow: '', title: 'Propuestas SGR' };
  });

  /** CTA "Nueva propuesta": si hay plan activo entra por oportunidades; si no, evaluar directo. */
  readonly createRoute = computed(() => {
    const planId = this.planContext.planActivoId();
    return planId ? `/sgr/oportunidades/${planId}` : '/sgr/evaluar-proyecto';
  });

  readonly railGroups = computed<RailGroup[]>(() => {
    const rol = this.auth.rol();
    const planId = this.planContext.planActivoId();

    const crearItems = [
      { label: 'Evaluar proyecto', route: '/sgr/evaluar-proyecto', icon: '🎯' },
      // "Oportunidades del plan" requiere un plan activo; solo se muestra si existe
      // (evita colisión de ruta/estado-activo con "Cargar plan").
      ...(planId ? [{ label: 'Oportunidades del plan', route: `/sgr/oportunidades/${planId}`, icon: '💰' }] : []),
      { label: 'Mis proyectos SGR', route: '/sgr/mis-proyectos', icon: '📋' },
    ];

    const groups: RailGroup[] = [
      {
        label: 'Crear propuesta SGR',
        items: crearItems,
      },
      {
        label: 'Planes de desarrollo',
        items: [
          { label: 'Cargar plan', route: '/cargar-plan', icon: '📂' },
          { label: 'Biblioteca',  route: '/biblioteca',  icon: '📚' },
        ],
      },
      {
        label: 'Conocimiento',
        items: [
          { label: 'Búsqueda RAG',         route: '/busqueda-raag',     icon: '🔍' },
          { label: 'Base de conocimiento', route: '/base-conocimiento', icon: '⚡' },
        ],
      },
    ];

    if (rol === 'superadmin' || rol === 'administrador') {
      groups.push({
        label: 'Administración',
        items: [
          { label: 'Usuarios',        route: '/admin/usuarios',   icon: '👥' },
          { label: 'Matriz de proyectos', route: '/admin/sgr-matriz', icon: '📊' },
          { label: 'Normas del indexer', route: '/admin/normas',  icon: '⚡' },
        ],
      });
    }

    return groups;
  });

  logout(): void {
    this.auth.logout();
  }
}
