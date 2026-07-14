import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Interfaces espejo de los schemas FastAPI ───────────────────────────────

export interface ApiSectorOut {
  id: number;
  sector: string;
  icono: string | null;
  cobertura_pct: number;
}

export interface ApiActorCompetencia {
  id:     number;
  titulo: string;
  sector: string | null;
}

export interface ApiActorOut {
  id: number;
  nombre: string;
  tipo: string;
  icono: string | null;
  resp_count: number;
  nivel: string | null;
  sector: string | null;
  origen_contexto: string | null;
  competencias: ApiActorCompetencia[];
  badge_label: string | null;
  badge_variant: string;
  destacado: boolean;
}

export interface ApiResponsabilidadOut {
  id: number;
  titulo: string;
  descripcion: string | null;
  sector: string | null;
  tipo: string;
  referencia_legal: string | null;
  origen_contexto: string | null;
  icono: string;
}

export interface ApiBrechaOut {
  id: number;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  severidad: string;
  referencia_legal: string | null;
  tipo_detallado: string | null;
  recomendacion: string | null;
  origen_contexto: string | null;
  icono: string;
}

export interface ApiActorVinculado {
  nombre: string;
  nivel:  string;
  tipo:   string;
}

export interface ApiMatrizOut {
  id: number;
  competencia: string;
  actor: string | null;
  ley_base: string | null;
  nacion: string;
  departamento: string;
  municipio: string;
  especializado: string;
  brecha: string;
  sector: string | null;
  origen_contexto: string | null;
  actores_vinculados: ApiActorVinculado[];
}

export interface ApiNormaOut {
  id: number;
  id_norma: string | null;
  norma_codigo: string | null;
  titulo: string;
  articulos: string | null;
  extracto: string | null;
  tipo: string;
  vigente: boolean;
  advertencia: string | null;
  relevancia: number;
}

export interface ApiPlanSummary {
  id: string;
  titulo: string;
  nombre_corto: string | null;
  entidad: string | null;
  entidad_icono: string;
  nivel: string;
  periodo: string | null;
  estado: string;
  resp_total: number;
  leyes_total: number;
  actores_total: number;
  brechas_total: number;
  avance_pct: number;
  creado_en: string;
  actualizado_en: string;
  sectores: ApiSectorOut[];
}

export interface ApiPlanDetail extends ApiPlanSummary {
  descripcion: string | null;
  archivo_nombre: string | null;
  qdrant_doc_id: string | null;
  actores: ApiActorOut[];
  responsabilidades: ApiResponsabilidadOut[];
  brechas: ApiBrechaOut[];
  matriz: ApiMatrizOut[];
  normas: ApiNormaOut[];
}

export interface ApiConocimientoOut {
  id: string;
  nombre: string;
  tipo: string;
  coleccion_id: string;
  descripcion: string | null;
  archivo_nombre: string | null;
  archivo_tamano: number | null;
  qdrant_doc_id: string | null;
  chunk_count: number;
  estado: string;
  error_mensaje: string | null;
  creado_en: string;
}

export interface ApiConocimientoCreate {
  nombre: string;
  tipo?: string;
  coleccion_id?: string;
  descripcion?: string | null;
  archivo_nombre?: string | null;
  archivo_tamano?: number | null;
  qdrant_doc_id?: string | null;
  chunk_count?: number;
  estado?: string;
  error_mensaje?: string | null;
}

export interface ApiPlanCreate {
  titulo: string;
  nombre_corto?: string;
  entidad?: string;
  entidad_icono?: string;
  nivel: string;
  periodo?: string;
  estado?: string;
  descripcion?: string;
  archivo_nombre?: string;
  qdrant_doc_id?: string;
  resp_total?: number;
  leyes_total?: number;
  actores_total?: number;
  brechas_total?: number;
  avance_pct?: number;
  sectores?: { sector: string; icono?: string; cobertura_pct?: number }[];
  actores?: {
    nombre: string; tipo?: string; icono?: string;
    resp_count?: number; badge_label?: string; badge_variant?: string; destacado?: boolean;
  }[];
  responsabilidades?: {
    titulo: string; descripcion?: string; sector?: string;
    tipo?: string; referencia_legal?: string; icono?: string;
  }[];
  brechas?: { titulo: string; descripcion?: string; tipo?: string; severidad?: string; icono?: string }[];
  normas?: {
    titulo: string; norma_codigo?: string; articulos?: string; extracto?: string;
    tipo?: string; vigente?: boolean; advertencia?: string; relevancia?: number;
  }[];
}

export interface ApiAlertaNormativaOut {
  id: number;
  plan_id: string | null;
  tipo: 'modificacion' | 'derogacion' | 'nueva_norma' | 'jurisprudencia';
  titulo: string;
  descripcion: string | null;
  norma_ref: string | null;
  severidad: 'alta' | 'media' | 'baja';
  leida: boolean;
  creado_en: string;
}

export interface ApiPlanUpdate {
  titulo?: string;
  nombre_corto?: string;
  entidad?: string;
  entidad_icono?: string;
  nivel?: string;
  periodo?: string;
  estado?: string;
  descripcion?: string;
  qdrant_doc_id?: string;
  resp_total?: number;
  leyes_total?: number;
  actores_total?: number;
  brechas_total?: number;
  avance_pct?: number;
}

// ── Service ────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PlanApiService {
  private http = inject(HttpClient);
  private base = environment.ragApiUrl;

  listPlanes(params?: {
    nivel?: string;
    estado?: string;
    skip?: number;
    limit?: number;
  }): Observable<ApiPlanSummary[]> {
    const qp: Record<string, string> = {};
    if (params?.nivel)       qp['nivel']  = params.nivel;
    if (params?.estado)      qp['estado'] = params.estado;
    if (params?.skip  != null) qp['skip']  = String(params.skip);
    if (params?.limit != null) qp['limit'] = String(params.limit);
    return this.http
      .get<ApiPlanSummary[]>(`${this.base}/api/v1/planes/`, { params: qp })
      .pipe(catchError(this.handleError));
  }

  getPlanDetail(planId: string): Observable<ApiPlanDetail> {
    return this.http
      .get<ApiPlanDetail>(`${this.base}/api/v1/planes/${encodeURIComponent(planId)}`)
      .pipe(catchError(this.handleError));
  }

  listConocimiento(params?: {
    coleccion_id?: string;
    estado?: string;
    skip?: number;
    limit?: number;
  }): Observable<ApiConocimientoOut[]> {
    const qp: Record<string, string> = {};
    if (params?.coleccion_id) qp['coleccion_id'] = params.coleccion_id;
    if (params?.estado)       qp['estado']       = params.estado;
    if (params?.skip  != null) qp['skip']  = String(params.skip);
    if (params?.limit != null) qp['limit'] = String(params.limit);
    return this.http
      .get<ApiConocimientoOut[]>(`${this.base}/api/v1/conocimiento/`, { params: qp })
      .pipe(catchError(this.handleError));
  }

  createConocimiento(data: ApiConocimientoCreate): Observable<ApiConocimientoOut> {
    return this.http
      .post<ApiConocimientoOut>(`${this.base}/api/v1/conocimiento/`, data)
      .pipe(catchError(this.handleError));
  }

  deshabilitarConocimiento(docId: string): Observable<ApiConocimientoOut> {
    return this.http
      .post<ApiConocimientoOut>(`${this.base}/api/v1/conocimiento/${encodeURIComponent(docId)}/deshabilitar`, {})
      .pipe(catchError(this.handleError));
  }

  habilitarConocimiento(docId: string): Observable<ApiConocimientoOut> {
    return this.http
      .post<ApiConocimientoOut>(`${this.base}/api/v1/conocimiento/${encodeURIComponent(docId)}/habilitar`, {})
      .pipe(catchError(this.handleError));
  }

  deleteConocimiento(docId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/api/v1/conocimiento/${encodeURIComponent(docId)}`)
      .pipe(catchError(this.handleError));
  }

  createPlan(data: ApiPlanCreate): Observable<ApiPlanDetail> {
    return this.http
      .post<ApiPlanDetail>(`${this.base}/api/v1/planes/`, data)
      .pipe(catchError(this.handleError));
  }

  updatePlan(planId: string, data: ApiPlanUpdate): Observable<ApiPlanSummary> {
    return this.http
      .patch<ApiPlanSummary>(`${this.base}/api/v1/planes/${encodeURIComponent(planId)}`, data)
      .pipe(catchError(this.handleError));
  }

  deletePlan(planId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/api/v1/planes/${encodeURIComponent(planId)}`)
      .pipe(catchError(this.handleError));
  }

  listarAlertas(planId: string, soloNoLeidas?: boolean): Observable<ApiAlertaNormativaOut[]> {
    const qp: Record<string, string> = {};
    if (soloNoLeidas != null) qp['solo_no_leidas'] = String(soloNoLeidas);
    return this.http
      .get<ApiAlertaNormativaOut[]>(`${this.base}/api/v1/planes/${encodeURIComponent(planId)}/alertas`, { params: qp })
      .pipe(catchError(this.handleError));
  }

  verificarAlertas(planId: string): Observable<ApiAlertaNormativaOut[]> {
    return this.http
      .post<ApiAlertaNormativaOut[]>(`${this.base}/api/v1/planes/${encodeURIComponent(planId)}/alertas/check`, {})
      .pipe(catchError(this.handleError));
  }

  marcarAlertasLeidas(planId: string, ids: number[]): Observable<{ actualizadas: number }> {
    return this.http
      .patch<{ actualizadas: number }>(`${this.base}/api/v1/planes/${encodeURIComponent(planId)}/alertas/marcar-leidas`, { ids })
      .pipe(catchError(this.handleError));
  }

  exportPdf(planId: string): Observable<Blob> {
    return this.http
      .get(`${this.base}/api/v1/analysis/export-pdf/${encodeURIComponent(planId)}`, {
        responseType: 'blob',
      })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const msg = error.error?.detail ?? error.message ?? 'Error de conexión con la API';
    return throwError(() => new Error(msg));
  }
}
