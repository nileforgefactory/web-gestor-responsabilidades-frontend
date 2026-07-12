import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faPlus, faTrash, faBolt, faScaleBalanced, faLandmark, faTriangleExclamation,
  faCircleCheck, faWandMagicSparkles, faMagnifyingGlass, faXmark,
} from '@fortawesome/free-solid-svg-icons';
import {
  BackgroundScraperService,
  NormaBase,
  NormaTerritorial,
} from '../../core/services/background-scraper.service';

interface FilaNorma {
  id: string | null;        // null = nacional (solo lectura)
  codigo: string;
  tipo: string;
  origen: 'Nacional' | 'Territorial' | 'Descubierta por IA';
  prioridad: number;
  territorio: string | null;
  esTerritorial: boolean;
  raw?: NormaTerritorial;
}

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
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faXmark = faXmark;

  normasBase          = signal<NormaBase[]>([]);
  normasTerritoriales = signal<NormaTerritorial[]>([]);
  loading   = signal(true);
  guardando = signal(false);
  descubriendo = signal(false);
  errorMsg = signal<string | null>(null);
  okMsg    = signal<string | null>(null);
  search   = signal('');

  // Modales
  showManual   = signal(false);
  showDiscover = signal(false);

  // Formulario manual
  fCodigo = ''; fTerritorio = ''; fPrioridad = 2; fDescripcion = '';
  // Descubrimiento IA
  dMunicipio = ''; dDepartamento = '';

  readonly filas = computed<FilaNorma[]>(() => {
    const nac: FilaNorma[] = this.normasBase().map(n => ({
      id: null, codigo: n.codigo, tipo: this.tipoNorma(n.codigo),
      origen: 'Nacional' as const, prioridad: n.prioridad, territorio: null, esTerritorial: false,
    }));
    const terr: FilaNorma[] = this.normasTerritoriales().map(n => ({
      id: n.id, codigo: n.codigo, tipo: this.tipoNorma(n.codigo),
      origen: (n.descripcion === 'Descubierta por IA' ? 'Descubierta por IA' : 'Territorial') as FilaNorma['origen'],
      prioridad: n.prioridad, territorio: n.territorio, esTerritorial: true, raw: n,
    }));
    // Territoriales primero (lo gestionable arriba), luego nacionales.
    const todas = [...terr, ...nac];
    const q = this.search().toLowerCase().trim();
    if (!q) return todas;
    return todas.filter(f =>
      f.codigo.toLowerCase().includes(q) ||
      f.tipo.toLowerCase().includes(q) ||
      f.origen.toLowerCase().includes(q) ||
      (f.territorio ?? '').toLowerCase().includes(q),
    );
  });

  readonly totalCatalogo = computed(() =>
    this.normasBase().length + this.normasTerritoriales().filter(n => n.activo).length);

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.loading.set(true);
    this.api.listarNormasBase().subscribe({ next: b => this.normasBase.set(b), error: () => {} });
    this.api.listarNormasTerritoriales().subscribe({
      next: t => { this.normasTerritoriales.set(t); this.loading.set(false); },
      error: err => { this.errorMsg.set(err.error?.detail ?? 'No se pudieron cargar las normas'); this.loading.set(false); },
    });
  }

  // ── Modal manual ──────────────────────────────────────────────────────────
  openManual(): void {
    this.fCodigo = ''; this.fTerritorio = ''; this.fPrioridad = 2; this.fDescripcion = '';
    this.errorMsg.set(null);
    this.showManual.set(true);
  }
  closeManual(): void { this.showManual.set(false); }

  crear(): void {
    const codigo = this.fCodigo.trim();
    if (!codigo || this.guardando()) return;
    this.guardando.set(true);
    this.errorMsg.set(null); this.okMsg.set(null);
    this.api.crearNormaTerritorial({
      codigo,
      territorio: this.fTerritorio.trim() || null,
      prioridad: this.fPrioridad,
      descripcion: this.fDescripcion.trim() || null,
    }).subscribe({
      next: n => {
        this.normasTerritoriales.update(list => [n, ...list]);
        this.okMsg.set(`Norma "${n.codigo}" agregada al indexer.`);
        this.guardando.set(false);
        this.showManual.set(false);
      },
      error: err => { this.errorMsg.set(err.error?.detail ?? 'No se pudo agregar la norma'); this.guardando.set(false); },
    });
  }

  // ── Modal descubrimiento IA ───────────────────────────────────────────────
  openDiscover(): void {
    this.dMunicipio = ''; this.dDepartamento = '';
    this.errorMsg.set(null);
    this.showDiscover.set(true);
  }
  closeDiscover(): void { this.showDiscover.set(false); }

  descubrir(): void {
    if (this.descubriendo()) return;
    this.descubriendo.set(true);
    this.errorMsg.set(null); this.okMsg.set(null);
    this.api.descubrirNormas({
      municipio: this.dMunicipio.trim() || null,
      departamento: this.dDepartamento.trim() || null,
    }).subscribe({
      next: res => {
        this.descubriendo.set(false);
        this.showDiscover.set(false);
        if (res.agregadas.length) {
          this.okMsg.set(`La IA descubrió y agregó ${res.agregadas.length} norma(s): ${res.agregadas.join(', ')}.`);
          this.cargar();
        } else {
          this.okMsg.set(`La IA no encontró normas nuevas (${res.ya_presentes.length} ya estaban en el catálogo).`);
        }
      },
      error: err => { this.descubriendo.set(false); this.errorMsg.set(err.error?.detail ?? 'No se pudo ejecutar el descubrimiento con IA'); },
    });
  }

  eliminar(f: FilaNorma): void {
    if (!f.id) return;
    this.api.eliminarNormaTerritorial(f.id).subscribe({
      next: () => this.normasTerritoriales.update(list => list.filter(x => x.id !== f.id)),
      error: err => this.errorMsg.set(err.error?.detail ?? 'No se pudo eliminar la norma'),
    });
  }

  prioridadLabel(p: number): string {
    return p === 1 ? 'Crítica' : p === 2 ? 'Importante' : 'Complementaria';
  }

  tipoNorma(codigo: string): string {
    const c = (codigo || '').toLowerCase();
    if (c.includes('conpes')) return 'CONPES';
    const w = c.trim().split(/\s+/)[0] ?? '';
    const map: Record<string, string> = {
      ley: 'LEY', decreto: 'DECRETO', resolucion: 'RESOLUCIÓN', 'resolución': 'RESOLUCIÓN',
      acuerdo: 'ACUERDO', ordenanza: 'ORDENANZA', circular: 'CIRCULAR', directiva: 'DIRECTIVA',
    };
    return map[w] ?? 'NORMA';
  }
}
