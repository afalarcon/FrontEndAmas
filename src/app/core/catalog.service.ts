import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, throwError, timeout } from 'rxjs';
import { API_BASE_URL, API_ORIGIN_URL } from './api.config';
import { ApiResponse, CatalogCategory, CatalogImagesGroup, CategoryImage } from './api.types';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  constructor(private readonly http: HttpClient) {}

  catalogs() {
    return this.http
      .get<ApiResponse<CatalogCategory[]>>(`${API_BASE_URL}/catalogs`)
      .pipe(
        timeout(8000),
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleCatalogError(error)),
      );
  }

  catalogImages() {
    return this.http
      .get<ApiResponse<CatalogImagesGroup[]>>(`${API_BASE_URL}/catalogs/images`)
      .pipe(
        timeout(8000),
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleCatalogError(error)),
      );
  }

  imageUrl(image: CategoryImage): string {
    if (/^https?:\/\//i.test(image.url)) {
      return image.url;
    }

    const path = image.url.startsWith('/') ? image.url : `/${image.url}`;
    return `${API_ORIGIN_URL}${path}`;
  }

  private unwrap<T>(response: ApiResponse<T>): T {
    if (!response.succeeded || response.data === null) {
      throw new Error(response.error ?? 'No fue posible cargar el catalogo.');
    }

    return response.data;
  }

  private handleCatalogError(error: unknown) {
    const message =
      error instanceof Error && error.name === 'TimeoutError'
        ? 'La galeria esta tardando demasiado en cargar. Intenta de nuevo en unos segundos.'
        : 'No fue posible cargar las imagenes publicadas.';

    return throwError(() => new Error(message));
  }
}
