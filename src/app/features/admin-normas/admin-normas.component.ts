import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus, faTrash, faBolt, faScaleBalanced, faLandmark, faTriangleExclamation, faCircleCheck, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import {
  BackgroundScraperService,
  NormaBase,
  NormaTerritorial,
} from '../../core/services/background-scraper.service';

@Component({
  selector: 'app-admin-normas',
  standalone: true,
  imports: [FormsModule, FaIconComponent],
  templateUrl: './admin-normas.component.html',
  styleUrl: './admin-normas.component.css',
})
export class AdminNormasComponent implements OnInit {
  private api = inject(BackgroundScraperService);

  readonly faPlus = faPlus;
  readonly faTrash = faTrash;
  readonly faBolt = faBolt;
  readonly faScaleBalanced = faScaleBalanced;
  readonly faLandmark = faLandmark;
  readonly faTriangleExclamation = faTriangleExclamation;
  readonly faCircleCheck = faCircleCheck;
  readonly faWandMagicSparkles = faWandMagicSparkles;

  normasBase        = signal<NormaBase[]>([]);
  normasTerritoriales = signal<NormaTerritorial[]>([]);
  loading  = signal(true);
  guardando = signal(false);
  errorMsg = signal<string | null>(null);
  okMsg    = signal<string | null>(null);

  // Formulario de alta
  fCodigo      = '';
  fTerritorio  = '';
  fPrioridad   = 2;
  fDescripcion = '';

  // Descubrimiento con IA
  dMunicipio    = '';
  dDepartamento = '';
  descubriendo  = signal(false);

  readonly totalCatalogo = computed(() => this.normasBase().length + this.normasTerritoriales().filter(n => n.activo).length);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.api.listarNormasBase().subscribe({
      next: b => { this.normasBase.set(b); },
      error: () => {},
    });
    this.api.listarNormasTerritoriales().subscribe({
      next: t => { this.normasTerritoriales.set(t); this.loading.set(false); },
      error: err => { this.errorMsg.set(err.error?.detail ?? 'No se pudieron cargar las normas territoriales'); this.loading.set(false); },
    });
  }

  crear(): void {
    const codigo = this.fCodigo.trim();
    if (!codigo || this.guardando()) return;
    this.guardando.set(true);
    this.errorMsg.set(null);
    this.okMsg.set(null);
    this.api.crearNormaTerritorial({
      codigo,
      territorio: this.fTerritorio.trim() || null,
      prioridad: this.fPrioridad,
      descripcion: this.fDescripcion.trim() || null,
    }).subscribe({
      next: n => {
        this.normasTerritoriales.update(list => [n, ...list]);
        this.fCodigo = ''; this.fTerritorio = ''; this.fPrioridad = 2; this.fDescripcion = '';
        this.okMsg.set(`Norma "${n.codigo}" agregada al indexer.`);
        this.guardando.set(false);
      },
      error: err => { this.errorMsg.set(err.error?.detail ?? 'No se pudo agregar la norma'); this.guardando.set(false); },
    });
  }

  descubrir(): void {
    if (this.descubriendo()) return;
    this.descubriendo.set(true);
    this.errorMsg.set(null);
    this.okMsg.set(null);
    this.api.descubrirNormas({
      municipio: this.dMunicipio.trim() || null,
      departamento: this.dDepartamento.trim() || null,
    }).subscribe({
      next: res => {
        this.descubriendo.set(false);
        if (res.agregadas.length) {
          this.okMsg.set(`La IA descubrió y agregó ${res.agregadas.length} norma(s): ${res.agregadas.join(', ')}. Ya puedes indexarlas.`);
          this.cargar();
        } else {
          this.okMsg.set(`La IA no encontró normas nuevas (${res.ya_presentes.length} ya estaban en el catálogo).`);
        }
      },
      error: err => {
        this.descubriendo.set(false);
        this.errorMsg.set(err.error?.detail ?? 'No se pudo ejecutar el descubrimiento con IA');
      },
    });
  }

  eliminar(n: NormaTerritorial): void {
    this.api.eliminarNormaTerritorial(n.id).subscribe({
      next: () => this.normasTerritoriales.update(list => list.filter(x => x.id !== n.id)),
      error: err => this.errorMsg.set(err.error?.detail ?? 'No se pudo eliminar la norma'),
    });
  }

  prioridadLabel(p: number): string {
    return p === 1 ? 'Crítica' : p === 2 ? 'Importante' : 'Complementaria';
  }
}
