import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Request / Response shapes (espejo de los schemas FastAPI) ──────────────

export interface IngestTextRequest {
  collection_id: string;
  document_id: string;
  content: string;
  chunk_size?: number;
  chunk_overlap?: number;
}

export interface IngestTextResponse {
  collection_id: string;
  document_id: string;
  chunks_indexed: number;
}

export interface IngestFileParams {
  collection_id?: string;
  document_id?: string;
  chunk_size?: number;
  chunk_overlap?: number;
}

export interface RagChunk {
  chunk_id: string;
  document_id: string;
  collection_id: string;
  score: number;
  text: string;
  title: string | null;
  source_filename: string | null;
}

export interface RagSearchRequest {
  collection_ids: string[];
  query: string;
  top_k?: number;
  score_threshold?: number;
}

export interface RagSearchResponse {
  query: string;
  chunks: RagChunk[];
}

export interface RagCitation {
  chunk_id: string;
  document_id: string;
  collection_id: string;
  score: number;
  title: string | null;
  source_filename: string | null;
}

export interface AskRequest {
  collection_ids: string[];
  user_message: string;
  top_k?: number;
  score_threshold?: number;
}

export interface AskResponse {
  answer: string;
  citations: RagCitation[];
  confidence: number;
  used_chunks: string[];
  retrieval_empty: boolean;
}

export interface HealthReadyResponse {
  app_env: string;
  healthy: boolean;
  checks: {
    qdrant?: { reachable: boolean; url?: string; error?: string };
    ollama?: {
      enabled: boolean;
      daemon_reachable?: boolean;
      embedding_model_registered?: boolean;
      chat_model_registered?: boolean;
      error?: string;
    };
  };
  swagger_hint?: string;
}

// ── Service ────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class RagApiService {
  private http = inject(HttpClient);
  private base = environment.ragApiUrl;

  ingestText(req: IngestTextRequest): Observable<IngestTextResponse> {
    return this.http
      .post<IngestTextResponse>(`${this.base}/api/v1/rag/ingest-text`, req)
      .pipe(catchError(this.handleError));
  }

  ingestFile(file: File, params: IngestFileParams = {}): Observable<IngestTextResponse> {
    const form = new FormData();
    form.append('file', file);
    form.append('collection_id', params.collection_id ?? environment.ragCollection);
    if (params.document_id) form.append('document_id', params.document_id);
    if (params.chunk_size)  form.append('chunk_size',  String(params.chunk_size));
    if (params.chunk_overlap) form.append('chunk_overlap', String(params.chunk_overlap));
    return this.http
      .post<IngestTextResponse>(`${this.base}/api/v1/rag/ingest-file`, form)
      .pipe(catchError(this.handleError));
  }

  search(req: RagSearchRequest): Observable<RagSearchResponse> {
    return this.http
      .post<RagSearchResponse>(`${this.base}/api/v1/rag/search`, req)
      .pipe(catchError(this.handleError));
  }

  ask(req: AskRequest): Observable<AskResponse> {
    return this.http
      .post<AskResponse>(`${this.base}/api/v1/rag/ask`, req)
      .pipe(catchError(this.handleError));
  }

  healthReady(): Observable<HealthReadyResponse> {
    return this.http
      .get<HealthReadyResponse>(`${this.base}/health/ready`)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          // 503 = unhealthy but API is reachable; body has the check details
          if (err.status === 503 && err.error && typeof err.error === 'object') {
            return of(err.error as HealthReadyResponse);
          }
          return this.handleError(err);
        }),
      );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const msg = error.error?.detail ?? error.message ?? 'Error de conexión con el servicio RAG';
    return throwError(() => new Error(msg));
  }
}
