import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoTarea = 'idle' | 'running' | 'completed' | 'cancelled' | 'error';

export interface NormaBase {
  codigo: string;
  prioridad: number;
}

export interface NormaTerritorial {
  id: string;
  codigo: string;
  territorio: string | null;
  prioridad: number;
  descripcion: string | null;
  activo: boolean;
  creado_en: string | null;
}

export interface NormaTerritorialCreate {
  codigo: string;
  territorio?: string | null;
  prioridad?: number;
  descripcion?: string | null;
}

export interface DescubrirNormasRequest {
  municipio?: string | null;
  departamento?: string | null;
  tema?: string | null;
}

export interface DescubrirNormasResponse {
  descubiertas: string[];
  agregadas: string[];
  ya_presentes: string[];
}

export interface BackgroundScraperEstado {
  estado: EstadoTarea;
  iniciado_en: string | null;
  finalizado_en: string | null;
  duracion_max_min: number;
  normas_total: number;
  normas_procesadas: number;
  normas_indexadas: number;
  normas_fallidas: number;
  norma_actual: string | null;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class BackgroundScraperService implements OnDestroy {
  private http = inject(HttpClient);
  private base = `${environment.ragApiUrl}/api/v1/background-scraper`;

  readonly estado = signal<BackgroundScraperEstado>({
    estado: 'idle',
    iniciado_en: null,
    finalizado_en: null,
    duracion_max_min: 30,
    normas_total: 0,
    normas_procesadas: 0,
    normas_indexadas: 0,
    normas_fallidas: 0,
    norma_actual: null,
    error: null,
  });

  // true mientras corre
  readonly isRunning = computed(() => this.estado().estado === 'running');

  // Minutos restantes estimados
  readonly minutosRestantes = computed(() => {
    const e = this.estado();
    if (e.estado !== 'running' || !e.iniciado_en) return null;
    const inicio = new Date(e.iniciado_en).getTime();
    const transcurrido = (Date.now() - inicio) / 60_000;
    return Math.max(0, Math.round(e.duracion_max_min - transcurrido));
  });

  // Porcentaje de normas procesadas
  readonly progresoPct = computed(() => {
    const e = this.estado();
    if (!e.normas_total) return 0;
    return Math.round((e.normas_procesadas / e.normas_total) * 100);
  });

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Consultar estado inicial al arrancar
    this.refrescarEstado();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  refrescarEstado(): void {
    this.http.get<BackgroundScraperEstado>(`${this.base}/estado`).subscribe({
      next: (e) => {
        this.estado.set(e);
        // Si está corriendo, activar polling; si terminó, desactivarlo
        if (e.estado === 'running') {
          this.startPolling();
        } else {
          this.stopPolling();
        }
      },
      error: () => {},
    });
  }

  iniciar(duracionMin?: number): void {
    this.http.post<BackgroundScraperEstado>(`${this.base}/iniciar`, {
      duracion_min: duracionMin ?? null,
      prioridad_max: 3,
      pais: 'COLOMBIA',
      solo_faltantes: true,
    }).subscribe({
      next: (e) => {
        this.estado.set(e);
        this.startPolling();
      },
      error: () => {},
    });
  }

  cancelar(): void {
    this.http.post<BackgroundScraperEstado>(`${this.base}/cancelar`, {}).subscribe({
      next: (e) => {
        this.estado.set(e);
        this.stopPolling();
      },
      error: () => {},
    });
  }

  // ── Catálogo de normas (nacionales base + territoriales) ──────────────────
  listarNormasBase(): Observable<NormaBase[]> {
    return this.http.get<NormaBase[]>(`${this.base}/normas-base?prioridad_max=3`);
  }

  listarNormasTerritoriales(): Observable<NormaTerritorial[]> {
    return this.http.get<NormaTerritorial[]>(`${this.base}/normas-territoriales`);
  }

  crearNormaTerritorial(payload: NormaTerritorialCreate): Observable<NormaTerritorial> {
    return this.http.post<NormaTerritorial>(`${this.base}/normas-territoriales`, payload);
  }

  eliminarNormaTerritorial(id: string): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.base}/normas-territoriales/${id}`);
  }

  descubrirNormas(payload: DescubrirNormasRequest): Observable<DescubrirNormasResponse> {
    return this.http.post<DescubrirNormasResponse>(`${this.base}/descubrir-normas`, payload);
  }

  private startPolling(): void {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(() => this.refrescarEstado(), 5000);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
