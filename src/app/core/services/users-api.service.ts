import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChangeRolRequest,
  MunicipioResult,
  UserCreateRequest,
  UserSummary,
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private http = inject(HttpClient);
  private base = environment.ragApiUrl;

  listUsers(coleccion_id?: string): Observable<UserSummary[]> {
    const params: Record<string, string> = {};
    if (coleccion_id) params['coleccion_id'] = coleccion_id;
    return this.http
      .get<UserSummary[]>(`${this.base}/api/v1/users`, { params })
      .pipe(catchError(this.handleError));
  }

  createUser(data: UserCreateRequest): Observable<UserSummary> {
    return this.http
      .post<UserSummary>(`${this.base}/api/v1/users`, data)
      .pipe(catchError(this.handleError));
  }

  buscarMunicipios(q: string): Observable<MunicipioResult[]> {
    return this.http
      .get<MunicipioResult[]>(`${this.base}/api/v1/territorio/municipios`, { params: { q } })
      .pipe(catchError(this.handleError));
  }

  changeRol(userId: string, req: ChangeRolRequest): Observable<UserSummary> {
    return this.http
      .put<UserSummary>(`${this.base}/api/v1/user/${encodeURIComponent(userId)}/change-rol`, req)
      .pipe(catchError(this.handleError));
  }

  deleteUser(userId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/api/v1/user/${encodeURIComponent(userId)}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    const msg = err.error?.detail ?? err.message ?? 'Error de conexión';
    return throwError(() => new Error(msg));
  }
}
