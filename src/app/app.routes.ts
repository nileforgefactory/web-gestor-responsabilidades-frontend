import { Routes } from '@angular/router';
import { CargarPlanComponent } from './features/cargar-plan/cargar-plan.component';
import { BibliotecaPlanes } from './features/biblioteca-planes/biblioteca-planes.component';
import { PlanDetailPageComponent } from './features/plan-detail/plan-detail-page.component';
import { BusquedaRaagComponent } from './features/busqueda-raag/busqueda-raag.component';
import { BaseConocimientoComponent } from './features/base-conocimiento/base-conocimiento.component';
import { AdminUsuariosComponent } from './features/admin-usuarios/admin-usuarios.component';
import { LoginComponent } from './features/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { onboardingGuard } from './core/guards/onboarding.guard';
import { homeRedirectGuard } from './core/guards/home-redirect.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  // ── Onboarding — rutas públicas (solo requieren auth) ────────────────────
  {
    path: 'onboarding',
    canActivate: [authGuard],
    children: [
      {
        path: 'cambiar-contrasena',
        loadComponent: () =>
          import('./features/onboarding/cambiar-contrasena/cambiar-contrasena.component')
            .then(m => m.CambiarContrasenaComponent),
      },
      {
        path: 'cargar-plan',
        loadComponent: () =>
          import('./features/cargar-plan/cargar-plan.component')
            .then(m => m.CargarPlanComponent),
      },
    ],
  },

  // ── App principal — requiere auth + onboarding completo ──────────────────
  {
    path: '',
    canActivate: [authGuard, onboardingGuard],
    children: [
      { path: '',                  pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },
      { path: 'cargar-plan',       component: CargarPlanComponent },
      { path: 'biblioteca',        component: BibliotecaPlanes },
      { path: 'plan/:id',          component: PlanDetailPageComponent },
      { path: 'busqueda-raag',     component: BusquedaRaagComponent },
      { path: 'base-conocimiento', component: BaseConocimientoComponent },
      {
        path: 'admin/usuarios',
        component: AdminUsuariosComponent,
        canActivate: [adminGuard],
      },

      // ── SGR — Caja de Herramientas ─────────────────────────────────────
      {
        path: 'sgr/oportunidades/:planId',
        loadComponent: () =>
          import('./features/sgr/oportunidades/oportunidades.component')
            .then(m => m.OportunidadesComponent),
      },
      {
        path: 'sgr/evaluar-proyecto',
        loadComponent: () =>
          import('./features/sgr/evaluar-proyecto/evaluar-proyecto.component')
            .then(m => m.EvaluarProyectoComponent),
      },
      {
        path: 'sgr/ficha-mga/:proyectoId',
        loadComponent: () =>
          import('./features/sgr/ficha-proyecto/ficha-proyecto.component')
            .then(m => m.FichaProyectoComponent),
      },
      {
        path: 'sgr/duplicidad/:proyectoId',
        loadComponent: () =>
          import('./features/sgr/duplicidad-check/duplicidad-check.component')
            .then(m => m.DuplicidadCheckComponent),
      },
    ],
  },
];
