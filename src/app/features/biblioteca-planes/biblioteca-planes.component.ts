import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass, faXmark, faFolderOpen } from '@fortawesome/free-solid-svg-icons';
import { PlanService } from '../../core/services/plan.service';
import { Plan, NivelTerritorial, PlanStatus } from '../../core/models/plan.model';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../shared/components/sidebar/sidebar.component';
import { PlanCardComponent } from '../../shared/components/plan-card/plan-card.component';

@Component({
  selector: 'app-biblioteca-planes',
  standalone: true,
  imports: [SidebarComponent, PlanCardComponent, FaIconComponent],
  templateUrl: './biblioteca-planes.component.html',
  styleUrl: './biblioteca-planes.component.css',
})
export class BibliotecaPlanes implements OnInit {
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faXmark = faXmark;
  readonly faFolderOpen = faFolderOpen;

  private planService = inject(PlanService);
  private router      = inject(Router);

  nivelFilter  = signal<NivelTerritorial | 'all'>('all');
  statusFilter = signal<PlanStatus | 'all'>('all');
  search       = signal<string>('');

  sidebarSections = computed<SidebarSection[]>(() => {
    const nivel  = this.nivelFilter();
    const status = this.statusFilter();
    return [
      {
        label: 'Nivel territorial',
        items: [
          { id: 'nivel-all',           icon: '🌐', label: 'Todos los planes',  status: nivel === 'all'           ? 'active' : 'default' },
          { id: 'nivel-nacional',      icon: '🏛️', label: 'Nacionales',        status: nivel === 'nacional'      ? 'active' : 'default' },
          { id: 'nivel-departamental', icon: '🗺️', label: 'Departamentales',   status: nivel === 'departamental' ? 'active' : 'default' },
          { id: 'nivel-municipal',     icon: '🏙️', label: 'Municipales',       status: nivel === 'municipal'     ? 'active' : 'default' },
          { id: 'nivel-sectorial',     icon: '🔬', label: 'Sectoriales',       status: nivel === 'sectorial'     ? 'active' : 'default' },
        ],
      },
      {
        label: 'Estado',
        items: [
          { id: 'status-all',        icon: '📋', label: 'Todos',      status: status === 'all'        ? 'active' : 'default' },
          { id: 'status-analizado',  icon: '✅', label: 'Analizado',  status: status === 'analizado'  ? 'active' : 'default' },
          { id: 'status-en-proceso', icon: '🔄', label: 'En proceso', status: status === 'en-proceso' ? 'active' : 'default' },
          { id: 'status-archivado',  icon: '📦', label: 'Archivado',  status: status === 'archivado'  ? 'active' : 'default' },
        ],
      },
    ];
  });

  filteredPlans = computed(() => {
    const plans  = this.planService.plans();
    const nivel  = this.nivelFilter();
    const status = this.statusFilter();
    const q      = this.search().toLowerCase().trim();

    return plans.filter(p => {
      if (nivel  !== 'all' && p.nivel  !== nivel)  return false;
      if (status !== 'all' && p.status !== status) return false;
      if (q && ![p.title, p.entity, ...p.sectors].some(s => s.toLowerCase().includes(q))) return false;
      return true;
    });
  });

  avgAvance = computed(() => {
    const plans = this.filteredPlans();
    if (!plans.length) return 0;
    return Math.round(plans.reduce((sum, p) => sum + p.avance, 0) / plans.length);
  });

  ngOnInit(): void {
    this.planService.refresh();
  }

  onFilterClick(item: SidebarItem): void {
    if (!item.id) return;
    if (item.id.startsWith('nivel-')) {
      const val = item.id.replace('nivel-', '');
      this.nivelFilter.set(val === 'all' ? 'all' : val as NivelTerritorial);
    } else if (item.id.startsWith('status-')) {
      const val = item.id.replace('status-', '');
      this.statusFilter.set(val === 'all' ? 'all' : val as PlanStatus);
    }
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  openDetail(plan: Plan): void {
    this.router.navigate(['/plan', plan.id]);
  }

  async onDeletePlan(plan: Plan): Promise<void> {
    if (!confirm(`¿Eliminar "${plan.shortName}"? Esta acción no se puede deshacer.`)) return;
    try {
      await this.planService.deletePlan(plan.id);
    } catch {
      alert('No se pudo eliminar el plan. Intenta de nuevo.');
    }
  }
}
