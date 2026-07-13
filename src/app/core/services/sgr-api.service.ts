import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActualizarFichaMGARequest,
  ChatFichaMGAResponse,
  EvaluarPlanResponse,
  EvaluarProyectoRequest,
  EvaluarProyectoResponse,
  FichaMGAOut,
  GenerarFichaMGARequest,
  OnboardingStatus,
  ChangePasswordRequest,
  ProyectoSGROut,
  VerificarDuplicidadResponse,
} from '../models/sgr.model';

@Injectable({ providedIn: 'root' })
export class SgrApiService {
  private http = inject(HttpClient);
  private base = `${environment.ragApiUrl}/api/v1`;

  // ── Onboarding ──────────────────────────────────────────────────────────────

  getOnboardingStatus(): Observable<OnboardingStatus> {
    return this.http.get<OnboardingStatus>(`${this.base}/auth/onboarding-status`);
  }

  changePassword(req: ChangePasswordRequest): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${this.base}/auth/change-password`, req);
  }

  // ── Modo 1: Evaluación del Plan ─────────────────────────────────────────────

  evaluarPlan(
    planId: string,
    options: { topN?: number; soloElegibles?: boolean; guardar?: boolean } = {},
  ): Observable<EvaluarPlanResponse> {
    let params = new HttpParams();
    if (options.topN !== undefined) params = params.set('top_n', options.topN);
    if (options.soloElegibles !== undefined) params = params.set('solo_elegibles', options.soloElegibles);
    if (options.guardar !== undefined) params = params.set('guardar', options.guardar);
    return this.http.get<EvaluarPlanResponse>(`${this.base}/sgr/evaluar-plan/${planId}`, { params });
  }

  listarProyectos(planId: string, filters: { modo?: string; estado?: string } = {}): Observable<ProyectoSGROut[]> {
    let params = new HttpParams();
    if (filters.modo)   params = params.set('modo', filters.modo);
    if (filters.estado) params = params.set('estado', filters.estado);
    return this.http.get<ProyectoSGROut[]>(`${this.base}/sgr/proyectos/${planId}`, { params });
  }

  detalleProyecto(proyectoId: string): Observable<ProyectoSGROut> {
    return this.http.get<ProyectoSGROut>(`${this.base}/sgr/proyecto/${proyectoId}`);
  }

  // ── M4: Ficha MGA ────────────────────────────────────────────────────────────

  generarFichaMGA(proyectoId: string, req: GenerarFichaMGARequest = {}): Observable<FichaMGAOut> {
    return this.http.post<FichaMGAOut>(`${this.base}/sgr/generar-ficha-mga/${proyectoId}`, req);
  }

  actualizarFichaMGA(proyectoId: string, payload: ActualizarFichaMGARequest): Observable<FichaMGAOut> {
    return this.http.patch<FichaMGAOut>(`${this.base}/sgr/ficha-mga/${proyectoId}`, payload);
  }

  chatFichaMGA(proyectoId: string, mensaje: string): Observable<ChatFichaMGAResponse> {
    return this.http.post<ChatFichaMGAResponse>(`${this.base}/sgr/ficha-mga/${proyectoId}/chat`, { mensaje });
  }

  exportarFichaMGADocx(proyectoId: string): Observable<Blob> {
    return this.http.get(`${this.base}/sgr/ficha-mga/${proyectoId}/export-docx`, { responseType: 'blob' });
  }

  // ── M3: Duplicidad ───────────────────────────────────────────────────────────

  verificarDuplicidad(proyectoId: string): Observable<VerificarDuplicidadResponse> {
    return this.http.post<VerificarDuplicidadResponse>(
      `${this.base}/sgr/verificar-duplicidad/${proyectoId}`,
      {},
    );
  }

  // ── M5: Modo 2 ───────────────────────────────────────────────────────────────

  evaluarProyecto(req: EvaluarProyectoRequest): Observable<EvaluarProyectoResponse> {
    return this.http.post<EvaluarProyectoResponse>(`${this.base}/sgr/evaluar-proyecto`, req);
  }

  // ── Extracción de texto de un archivo adjunto ───────────────────────────────

  extraerTextoDocumento(file: File): Observable<{ texto: string; nombre_archivo: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ texto: string; nombre_archivo: string }>(
      `${this.base}/documents/extract`,
      form,
    );
  }
}
