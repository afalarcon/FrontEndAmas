import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, tap } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { ApiResponse, LoginResponse } from './api.types';

const TOKEN_KEY = 'amas_admin_token';
const EXPIRES_KEY = 'amas_admin_expires_at';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenState = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly userEmail = computed(() => this.readEmail(this.tokenState()) ?? 'Administrador');
  readonly roles = computed(() => this.readArrayClaim(this.tokenState(), 'role'));
  readonly permissions = computed(() => this.readArrayClaim(this.tokenState(), 'permission'));
  readonly isAuthenticated = computed(() => {
    const token = this.tokenState();
    const expiresAt = localStorage.getItem(EXPIRES_KEY);

    if (!token || !expiresAt) {
      return false;
    }

    return new Date(expiresAt).getTime() > Date.now();
  });

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  login(email: string, password: string) {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${API_BASE_URL}/auth/login`, { email, password })
      .pipe(
        map((response) => {
          if (!response.succeeded || !response.data) {
            throw new Error(response.error ?? 'No fue posible iniciar sesión.');
          }

          return response.data;
        }),
        tap((session) => {
          localStorage.setItem(TOKEN_KEY, session.accessToken);
          localStorage.setItem(EXPIRES_KEY, session.expiresAt);
          this.tokenState.set(session.accessToken);
        }),
      );
  }

  token(): string | null {
    return this.isAuthenticated() ? this.tokenState() : null;
  }

  hasPermission(permission: string): boolean {
    const permissions = this.permissions();
    return permissions.includes('admin.full_access') || permissions.includes(permission);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    this.tokenState.set(null);
    this.router.navigate(['/admin/login']);
  }

  private readEmail(token: string | null): string | null {
    if (!token) {
      return null;
    }

    try {
      const encodedPayload = token.split('.')[1] ?? '';
      const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
      return payload.email ?? payload.sub ?? null;
    } catch {
      return null;
    }
  }

  private readArrayClaim(token: string | null, claim: string): string[] {
    if (!token) {
      return [];
    }

    try {
      const encodedPayload = token.split('.')[1] ?? '';
      const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
      const value = payload[claim] ?? payload[`http://schemas.microsoft.com/ws/2008/06/identity/claims/${claim}`];

      if (Array.isArray(value)) {
        return value;
      }

      return value ? [value] : [];
    } catch {
      return [];
    }
  }
}
