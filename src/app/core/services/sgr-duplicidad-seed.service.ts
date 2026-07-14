import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoSeedTarea = 'idle' | 'running' | 'completed' | 'cancelled' | 'error';
export type FaseSeed = 'extrayendo' | 'leyendo_filas' | 'indexando' | null;

export interface DuplicidadSeedEstado {
  estado: EstadoSeedTarea;
  fase: FaseSeed;
  iniciado_en: string | null;
  finalizado_en: string | null;
  filas_leidas: number;
  filas_filtradas: number;
  proyectos_indexados: number;
  proyectos_fallidos: number;
  error: string | null;
}

export interface ProyectoMatrizSGROut {
  id: string;
  bpin: string | null;
  nombre: string;
  municipio: string | null;
  departamento: string | null;
  sector: string | null;
  estado: string | null;
  valor_sgr: string | null;
  fecha_aprobacion: string | null;
  creado_en: string;
}

export interface ProyectoMatrizSGRListResponse {
  items: ProyectoMatrizSGROut[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class SgrDuplicidadSeedService implements OnDestroy {
  private http = inject(HttpClient);
  private base = `${environment.ragApiUrl}/api/v1/sgr/duplicidad-seed`;

  readonly estado = signal<DuplicidadSeedEstado>({
    estado: 'idle',
    fase: null,
    iniciado_en: null,
    finalizado_en: null,
    filas_leidas: 0,
    filas_filtradas: 0,
    proyectos_indexados: 0,
    proyectos_fallidos: 0,
    error: null,
  });

  readonly isRunning = computed(() => this.estado().estado === 'running');
  readonly subiendo = signal(false);

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  ngOnDestroy(): void {
    this.stopPolling();
  }

  refrescarEstado(): void {
    this.http.get<DuplicidadSeedEstado>(`${this.base}/estado`).subscribe({
      next: (e) => {
        this.estado.set(e);
        if (e.estado === 'running') {
          this.startPolling();
        } else {
          this.stopPolling();
        }
      },
      error: () => {},
    });
  }

  iniciar(file: File): void {
    const form = new FormData();
    form.append('file', file);
    this.subiendo.set(true);
    this.http.post<DuplicidadSeedEstado>(`${this.base}/iniciar`, form).subscribe({
      next: (e) => {
        this.subiendo.set(false);
        this.estado.set(e);
        this.startPolling();
      },
      error: (err) => {
        this.subiendo.set(false);
        this.estado.update(prev => ({ ...prev, estado: 'error', error: err.error?.detail ?? 'Error al subir el archivo' }));
      },
    });
  }

  cancelar(): void {
    this.http.post<DuplicidadSeedEstado>(`${this.base}/cancelar`, {}).subscribe({
      next: (e) => {
        this.estado.set(e);
        this.stopPolling();
      },
      error: () => {},
    });
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

  listarProyectos(params: { search?: string; skip?: number; limit?: number }): Observable<ProyectoMatrizSGRListResponse> {
    let httpParams = new HttpParams()
      .set('skip', String(params.skip ?? 0))
      .set('limit', String(params.limit ?? 50));
    if (params.search) httpParams = httpParams.set('search', params.search);
    return this.http.get<ProyectoMatrizSGRListResponse>(`${this.base}/proyectos`, { params: httpParams });
  }

  backfillDesdeQdrant(): Observable<{ proyectos_recuperados: number }> {
    return this.http.post<{ proyectos_recuperados: number }>(`${this.base}/backfill`, {});
  }
}
