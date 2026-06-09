import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, throwError, timeout } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  ApiResponse,
  AdminRole,
  AdminRolePayload,
  AdminUser,
  AdminUserPayload,
  Category,
  CategoryImage,
  CategoryPayload,
  CatalogCategory,
  CatalogImagesGroup,
  CatalogWarmup,
  Configuration,
  Product,
  ProductPayload,
  Permission,
  CreateAdminUserPayload,
} from './api.types';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}

  products() {
    return this.http
      .get<ApiResponse<Product[]>>(`${API_BASE_URL}/products`)
      .pipe(map((response) => this.unwrap(response)));
  }

  createProduct(payload: ProductPayload) {
    return this.http
      .post<ApiResponse<Product>>(`${API_BASE_URL}/products`, payload, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  updateProduct(id: string, payload: ProductPayload) {
    return this.http
      .put<ApiResponse<Product>>(`${API_BASE_URL}/products/${id}`, payload, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  deleteProduct(id: string) {
    return this.http.delete<ApiResponse<unknown>>(`${API_BASE_URL}/products/${id}`, {
      headers: this.headers(),
    });
  }

  categories() {
    return this.http
      .get<ApiResponse<Category[]>>(`${API_BASE_URL}/categories`)
      .pipe(map((response) => this.unwrap(response)));
  }

  createCategory(payload: CategoryPayload) {
    return this.http
      .post<ApiResponse<Category>>(`${API_BASE_URL}/categories`, payload, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  updateCategory(id: string, payload: CategoryPayload) {
    return this.http
      .put<ApiResponse<Category>>(`${API_BASE_URL}/categories/${id}`, payload, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  deleteCategory(id: string) {
    return this.http.delete<ApiResponse<unknown>>(`${API_BASE_URL}/categories/${id}`, {
      headers: this.headers(),
    });
  }

  categoryImages(categoryId: string) {
    return this.http
      .get<ApiResponse<CategoryImage[]>>(`${API_BASE_URL}/categories/${categoryId}/images`)
      .pipe(map((response) => this.unwrap(response)));
  }

  catalogs() {
    return this.http
      .get<ApiResponse<CatalogCategory[]>>(`${API_BASE_URL}/catalogs`)
      .pipe(map((response) => this.unwrap(response)));
  }

  catalogImages() {
    return this.http
      .get<ApiResponse<CatalogImagesGroup[]>>(`${API_BASE_URL}/catalogs/images`)
      .pipe(map((response) => this.unwrap(response)));
  }

  warmupCatalogCache() {
    return this.http
      .post<ApiResponse<CatalogWarmup>>(`${API_BASE_URL}/catalogs/cache/warmup`, null, {
        headers: this.headers(),
      })
      .pipe(map((response) => this.unwrap(response)));
  }

  users() {
    return this.http
      .get<ApiResponse<AdminUser[]>>(`${API_BASE_URL}/identity/users`, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  createUser(payload: CreateAdminUserPayload) {
    return this.http
      .post<ApiResponse<AdminUser>>(`${API_BASE_URL}/identity/users`, payload, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  updateUser(id: string, payload: AdminUserPayload) {
    return this.http
      .put<ApiResponse<AdminUser>>(`${API_BASE_URL}/identity/users/${id}`, payload, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  roles() {
    return this.http
      .get<ApiResponse<AdminRole[]>>(`${API_BASE_URL}/identity/roles`, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  createRole(payload: AdminRolePayload) {
    return this.http
      .post<ApiResponse<AdminRole>>(`${API_BASE_URL}/identity/roles`, payload, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  updateRole(id: string, payload: AdminRolePayload) {
    return this.http
      .put<ApiResponse<AdminRole>>(`${API_BASE_URL}/identity/roles/${id}`, payload, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  permissions() {
    return this.http
      .get<ApiResponse<Permission[]>>(`${API_BASE_URL}/identity/permissions`, { headers: this.headers() })
      .pipe(map((response) => this.unwrap(response)));
  }

  uploadCategoryImages(categoryId: string, files: File[], altText: string | null) {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    if (altText) {
      formData.append('altText', altText);
    }

    return this.http
      .post<ApiResponse<CategoryImage[]>>(`${API_BASE_URL}/categories/${categoryId}/images`, formData, {
        headers: this.headers(),
      })
      .pipe(
        timeout(15000),
        map((response) => this.unwrap(response)),
        catchError((error) => {
          if (error.name === 'TimeoutError') {
            return throwError(
              () => new Error('La carga tardó demasiado. Revisa si la API está activa e intenta de nuevo.'),
            );
          }

          return throwError(() => error);
        }),
      );
  }

  configurations() {
    return this.http
      .get<ApiResponse<Configuration[]>>(`${API_BASE_URL}/configurations`)
      .pipe(map((response) => this.unwrap(response)));
  }

  upsertConfiguration(key: string, value: string, description: string | null) {
    return this.http
      .put<ApiResponse<Configuration>>(
        `${API_BASE_URL}/configurations/${encodeURIComponent(key)}`,
        { value, description },
        { headers: this.headers() },
      )
      .pipe(map((response) => this.unwrap(response)));
  }

  private headers(): HttpHeaders {
    const token = this.auth.token();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private unwrap<T>(response: ApiResponse<T>): T {
    if (!response.succeeded || response.data === null) {
      throw new Error(response.error ?? 'La API no retornó datos.');
    }

    return response.data;
  }
}
