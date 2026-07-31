import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, throwError, timeout } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { ApiResponse, ContactRequestPayload, ContactRequestResponse } from './api.types';

@Injectable({ providedIn: 'root' })
export class ContactService {
  constructor(private readonly http: HttpClient) {}

  createContactRequest(payload: ContactRequestPayload) {
    return this.http
      .post<ApiResponse<ContactRequestResponse>>(`${API_BASE_URL}/contact-requests`, payload)
      .pipe(
        timeout(10000),
        map((response) => this.unwrap(response)),
        catchError(() => throwError(() => new Error('No fue posible enviar la solicitud.'))),
      );
  }

  private unwrap<T>(response: ApiResponse<T>): T {
    if (!response.succeeded || response.data === null) {
      throw new Error(response.error ?? 'No fue posible enviar la solicitud.');
    }

    return response.data;
  }
}
