import { Routes } from '@angular/router';
import { CargarPlanComponent } from './features/cargar-plan/cargar-plan.component';
import { BibliotecaPlanes } from './features/biblioteca-planes/biblioteca-planes.component';
import { PlanDetailPageComponent } from './features/plan-detail/plan-detail-page.component';
import { BusquedaRaagComponent } from './features/busqueda-raag/busqueda-raag.component';
import { BaseConocimientoComponent } from './features/base-conocimiento/base-conocimiento.component';

export const routes: Routes = [
  { path: '',                  redirectTo: 'cargar-plan', pathMatch: 'full' },
  { path: 'cargar-plan',       component: CargarPlanComponent },
  { path: 'biblioteca',        component: BibliotecaPlanes },
  { path: 'plan/:id',          component: PlanDetailPageComponent },
  { path: 'busqueda-raag',     component: BusquedaRaagComponent },
  { path: 'base-conocimiento', component: BaseConocimientoComponent },
];
