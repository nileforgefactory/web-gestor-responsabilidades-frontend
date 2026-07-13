import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowRight,
  faCircleCheck,
  faFileLines,
  faFolderOpen,
  faMagnifyingGlass,
  faPlus,
  faTrashCan,
  faTriangleExclamation,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { SgrApiService } from '../../../core/services/sgr-api.service';
import { ProyectoGuardadoOut } from '../../../core/models/sgr.model';

@Component({
  selector: 'app-mis-proyectos-sgr',
  standalone: true,
  imports: [FaIconComponent, RouterLink],
  templateUrl: './mis-proyectos.component.html',
  styleUrl: './mis-proyectos.component.css',
})
export class MisProyectosSgrComponent implements OnInit {
  private sgr    = inject(SgrApiService);
  private router = inject(Router);

  readonly faArrowRight = faArrowRight;
  readonly faCircleCheck = faCircleCheck;
  readonly faFileLines = faFileLines;
  readonly faFolderOpen = faFolderOpen;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faPlus = faPlus;
  readonly faTrashCan = faTrashCan;
  readonly faTriangleExclamation = faTriangleExclamation;
  readonly faXmark = faXmark;

  loading    = signal(true);
  errorMsg   = signal<string | null>(null);
  proyectos  = signal<ProyectoGuardadoOut[]>([]);
  search     = signal('');
  eliminando = signal<string | null>(null);

  filteredProyectos = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.proyectos();
    return this.proyectos().filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.sector_sgr.toLowerCase().includes(q) ||
      p.plan_titulo.toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.sgr.listarProyectosGuardados().subscribe({
      next: proyectos => { this.proyectos.set(proyectos); this.loading.set(false); },
      error: err => { this.errorMsg.set(err.error?.detail ?? 'Error al cargar tus proyectos'); this.loading.set(false); },
    });
  }

  abrirFicha(p: ProyectoGuardadoOut): void {
    this.router.navigate(['/sgr/ficha-mga', p.id]);
  }

  eliminarProyecto(p: ProyectoGuardadoOut, event: Event): void {
    event.stopPropagation();
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;

    this.eliminando.set(p.id);
    this.sgr.eliminarProyecto(p.id).subscribe({
      next: () => {
        this.proyectos.update(ps => ps.filter(x => x.id !== p.id));
        this.eliminando.set(null);
      },
      error: () => {
        alert('No se pudo eliminar el proyecto. Intenta de nuevo.');
        this.eliminando.set(null);
      },
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
