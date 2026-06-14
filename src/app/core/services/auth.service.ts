import { PLATFORM_ID, computed, inject, Injectable, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, MeResponse, TokenResponse } from '../models/auth.model';

const TOKEN_KEY = 'auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http       = inject(HttpClient);
  private router     = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private base       = environment.ragApiUrl;
  private isBrowser  = isPlatformBrowser(this.platformId);

  private _user        = signal<MeResponse | null>(null);
  private _initialized = signal(false);

  readonly user        = this._user.asReadonly();
  readonly initialized = this._initialized.asReadonly();
  readonly isLoggedIn  = computed(() => this._user() !== null);
  readonly rol         = computed(() => this._user()?.rol ?? null);

  constructor() {
    if (this.isBrowser && this.getToken()) {
      this.fetchMe().subscribe({
        next:  () => this._initialized.set(true),
        error: () => { this.clearSession(); this._initialized.set(true); },
      });
    } else {
      this._initialized.set(true);
    }
  }

  login(req: LoginRequest): Observable<MeResponse> {
    return this.http
      .post<TokenResponse>(`${this.base}/api/v1/auth/login`, req)
      .pipe(
        tap(res => this.saveToken(res.access_token)),
        switchMap(() => this.fetchMe()),
        catchError(err => {
          this.clearSession();
          const msg = err.error?.detail ?? err.message ?? 'Error de autenticación';
          return throwError(() => new Error(msg));
        }),
      );
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem(TOKEN_KEY) : null;
  }

  private fetchMe(): Observable<MeResponse> {
    return this.http
      .get<MeResponse>(`${this.base}/api/v1/me`)
      .pipe(tap(me => this._user.set(me)));
  }

  private saveToken(token: string): void {
    if (this.isBrowser) localStorage.setItem(TOKEN_KEY, token);
  }

  private clearSession(): void {
    if (this.isBrowser) localStorage.removeItem(TOKEN_KEY);
    this._user.set(null);
  }
}
