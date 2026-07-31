import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, throwError, timeout } from 'rxjs';
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
  InventoryItem,
  InventoryItemPayload,
  InventoryItemUpdatePayload,
  InvoiceImport,
  InvoiceExtractorStatus,
  InvoiceImportLine,
  InvoiceImportLinePayload,
  InventoryMovement,
  InventoryMovementPayload,
  Product,
  ProductImage,
  ProductPayload,
  Permission,
  CreateAdminUserPayload,
  Supplier,
  SupplierPayload,
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
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible cargar productos.')),
      );
  }

  createProduct(payload: ProductPayload) {
    return this.http
      .post<ApiResponse<Product>>(`${API_BASE_URL}/products`, payload, { headers: this.headers() })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible crear el producto.')),
      );
  }

  updateProduct(id: string, payload: ProductPayload) {
    return this.http
      .put<ApiResponse<Product>>(`${API_BASE_URL}/products/${id}`, payload, { headers: this.headers() })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible actualizar el producto.')),
      );
  }

  deleteProduct(id: string) {
    return this.http
      .delete<ApiResponse<unknown>>(`${API_BASE_URL}/products/${id}`, {
        headers: this.headers(),
      })
      .pipe(catchError((error) => this.handleApiError(error, 'No fue posible eliminar el producto.')));
  }

  productsByCategory(categoryId: string) {
    return this.http
      .get<ApiResponse<Product[]>>(`${API_BASE_URL}/categories/${categoryId}/products`)
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible cargar productos de la categoría.')),
      );
  }

  addProductToCategory(categoryId: string, productId: string) {
    return this.http
      .post<ApiResponse<Product>>(`${API_BASE_URL}/categories/${categoryId}/products/${productId}`, null, {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible asociar el producto a la categoría.')),
      );
  }

  reorderCategoryProducts(categoryId: string, items: { productId: string; sortOrder: number }[]) {
    return this.http
      .put<ApiResponse<Product[]>>(`${API_BASE_URL}/categories/${categoryId}/products/reorder`, items, {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible ordenar productos.')),
      );
  }

  productImages(productId: string) {
    return this.http
      .get<ApiResponse<ProductImage[]>>(`${API_BASE_URL}/products/${productId}/images`)
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible cargar imágenes del producto.')),
      );
  }

  uploadProductImages(productId: string, files: File[], altText: string | null) {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    if (altText) {
      formData.append('altText', altText);
    }

    return this.http
      .post<ApiResponse<ProductImage[]>>(`${API_BASE_URL}/products/${productId}/images`, formData, {
        headers: this.headers(),
      })
      .pipe(
        timeout(15000),
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible cargar las imágenes del producto.')),
      );
  }

  reorderProductImages(productId: string, items: { imageId: string; sortOrder: number }[]) {
    return this.http
      .put<ApiResponse<ProductImage[]>>(`${API_BASE_URL}/products/${productId}/images/reorder`, items, {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible ordenar las imágenes.')),
      );
  }

  setPrimaryProductImage(productId: string, imageId: string) {
    return this.http
      .put<ApiResponse<ProductImage>>(`${API_BASE_URL}/products/${productId}/images/${imageId}/primary`, null, {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible marcar la imagen principal.')),
      );
  }

  deleteProductImage(productId: string, imageId: string) {
    return this.http
      .delete<ApiResponse<unknown>>(`${API_BASE_URL}/products/${productId}/images/${imageId}`, {
        headers: this.headers(),
      })
      .pipe(catchError((error) => this.handleApiError(error, 'No fue posible eliminar la imagen.')));
  }

  inventoryItems() {
    return this.http
      .get<ApiResponse<InventoryItem[]>>(`${API_BASE_URL}/inventory/items`)
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible cargar inventario.')),
      );
  }

  createInventoryItem(payload: InventoryItemPayload) {
    return this.http
      .post<ApiResponse<InventoryItem>>(`${API_BASE_URL}/inventory/items`, payload, { headers: this.headers() })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible crear el ítem de inventario.')),
      );
  }

  updateInventoryItem(id: string, payload: InventoryItemUpdatePayload) {
    return this.http
      .put<ApiResponse<InventoryItem>>(`${API_BASE_URL}/inventory/items/${id}`, payload, { headers: this.headers() })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible actualizar el ítem de inventario.')),
      );
  }

  uploadInventoryItemImage(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .put<ApiResponse<InventoryItem>>(`${API_BASE_URL}/inventory/items/${id}/image`, formData, {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible guardar la imagen del ítem.')),
      );
  }

  deleteInventoryItemImage(id: string) {
    return this.http
      .delete<ApiResponse<InventoryItem>>(`${API_BASE_URL}/inventory/items/${id}/image`, {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible eliminar la imagen del ítem.')),
      );
  }

  inventoryMovements(itemId: string) {
    return this.http
      .get<ApiResponse<InventoryMovement[]>>(`${API_BASE_URL}/inventory/items/${itemId}/movements`)
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible cargar el Kardex.')),
      );
  }

  createInventoryMovement(itemId: string, payload: InventoryMovementPayload) {
    return this.http
      .post<ApiResponse<InventoryMovement>>(`${API_BASE_URL}/inventory/items/${itemId}/movements`, payload, {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible registrar el movimiento.')),
      );
  }

  invoiceImports() {
    return this.http
      .get<ApiResponse<InvoiceImport[]>>(`${API_BASE_URL}/inventory/invoices/imports`, { headers: this.headers() })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible cargar facturas de inventario.')),
      );
  }

  invoiceExtractorStatus() {
    return this.http
      .get<ApiResponse<InvoiceExtractorStatus>>(`${API_BASE_URL}/inventory/invoices/extractor/status`, {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible validar el estado del extractor de facturas.')),
      );
  }

  uploadInvoiceImport(file: File, metadata: { supplierName?: string; supplierTaxId?: string; invoiceNumber?: string; invoiceDate?: string; notes?: string }) {
    const formData = new FormData();
    formData.append('file', file);

    if (metadata.supplierName) {
      formData.append('supplierName', metadata.supplierName);
    }

    if (metadata.supplierTaxId) {
      formData.append('supplierTaxId', metadata.supplierTaxId);
    }

    if (metadata.invoiceNumber) {
      formData.append('invoiceNumber', metadata.invoiceNumber);
    }

    if (metadata.invoiceDate) {
      formData.append('invoiceDate', metadata.invoiceDate);
    }

    if (metadata.notes) {
      formData.append('notes', metadata.notes);
    }

    return this.http
      .post<ApiResponse<InvoiceImport>>(`${API_BASE_URL}/inventory/invoices/upload`, formData, {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible subir la factura.')),
      );
  }

  addInvoiceImportLine(importId: string, payload: InvoiceImportLinePayload) {
    return this.http
      .post<ApiResponse<InvoiceImportLine>>(`${API_BASE_URL}/inventory/invoices/imports/${importId}/lines`, payload, {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible agregar la línea de factura.')),
      );
  }

  updateInvoiceImportLine(importId: string, lineId: string, payload: InvoiceImportLinePayload) {
    return this.http
      .put<ApiResponse<InvoiceImportLine>>(
        `${API_BASE_URL}/inventory/invoices/imports/${importId}/lines/${lineId}`,
        payload,
        { headers: this.headers() },
      )
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible actualizar la línea de factura.')),
      );
  }

  confirmInvoiceImport(importId: string) {
    return this.http
      .post<ApiResponse<InvoiceImport>>(`${API_BASE_URL}/inventory/invoices/imports/${importId}/confirm`, null, {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible confirmar la factura.')),
      );
  }

  cancelInvoiceImport(importId: string) {
    return this.http
      .post<ApiResponse<InvoiceImport>>(`${API_BASE_URL}/inventory/invoices/imports/${importId}/cancel`, null, {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible cancelar la factura.')),
      );
  }

  suppliers() {
    return this.http
      .get<ApiResponse<Supplier[]>>(`${API_BASE_URL}/suppliers`, { headers: this.headers() })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible cargar proveedores.')),
      );
  }

  createSupplier(payload: SupplierPayload) {
    return this.http
      .post<ApiResponse<Supplier>>(`${API_BASE_URL}/suppliers`, payload, { headers: this.headers() })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible crear el proveedor.')),
      );
  }

  updateSupplier(id: string, payload: SupplierPayload) {
    return this.http
      .put<ApiResponse<Supplier>>(`${API_BASE_URL}/suppliers/${id}`, payload, { headers: this.headers() })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible actualizar el proveedor.')),
      );
  }

  categories() {
    return this.http
      .get<ApiResponse<Category[]>>(`${API_BASE_URL}/categories`)
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible cargar categorías.')),
      );
  }

  createCategory(payload: CategoryPayload) {
    return this.http
      .post<ApiResponse<Category>>(`${API_BASE_URL}/categories`, payload, { headers: this.headers() })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible crear la categoría.')),
      );
  }

  updateCategory(id: string, payload: CategoryPayload) {
    return this.http
      .put<ApiResponse<Category>>(`${API_BASE_URL}/categories/${id}`, payload, { headers: this.headers() })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible actualizar la categoría.')),
      );
  }

  deleteCategory(id: string) {
    return this.http
      .delete<ApiResponse<unknown>>(`${API_BASE_URL}/categories/${id}`, {
        headers: this.headers(),
      })
      .pipe(catchError((error) => this.handleApiError(error, 'No fue posible eliminar la categoría.')));
  }

  categoryImages(categoryId: string) {
    return this.http
      .get<ApiResponse<CategoryImage[]>>(`${API_BASE_URL}/categories/${categoryId}/images`)
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible cargar las imágenes.')),
      );
  }

  catalogs() {
    return this.http
      .get<ApiResponse<CatalogCategory[]>>(`${API_BASE_URL}/catalogs`)
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible cargar los catálogos.')),
      );
  }

  catalogImages() {
    return this.http
      .get<ApiResponse<CatalogImagesGroup[]>>(`${API_BASE_URL}/catalogs/images`)
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible cargar las imágenes de catálogo.')),
      );
  }

  warmupCatalogCache() {
    return this.http
      .post<ApiResponse<CatalogWarmup>>(`${API_BASE_URL}/catalogs/cache/warmup`, null, {
        headers: this.headers(),
      })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible preparar la caché de catálogo.')),
      );
  }

  users() {
    return this.http
      .get<ApiResponse<AdminUser[]>>(`${API_BASE_URL}/identity/users`, { headers: this.headers() })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible cargar usuarios.')),
      );
  }

  createUser(payload: CreateAdminUserPayload) {
    return this.http
      .post<ApiResponse<AdminUser>>(`${API_BASE_URL}/identity/users`, payload, { headers: this.headers() })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible crear el usuario.')),
      );
  }

  updateUser(id: string, payload: AdminUserPayload) {
    return this.http
      .put<ApiResponse<AdminUser>>(`${API_BASE_URL}/identity/users/${id}`, payload, { headers: this.headers() })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible actualizar el usuario.')),
      );
  }

  roles() {
    return this.http
      .get<ApiResponse<AdminRole[]>>(`${API_BASE_URL}/identity/roles`, { headers: this.headers() })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible cargar roles.')),
      );
  }

  createRole(payload: AdminRolePayload) {
    return this.http
      .post<ApiResponse<AdminRole>>(`${API_BASE_URL}/identity/roles`, payload, { headers: this.headers() })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible crear el rol.')),
      );
  }

  updateRole(id: string, payload: AdminRolePayload) {
    return this.http
      .put<ApiResponse<AdminRole>>(`${API_BASE_URL}/identity/roles/${id}`, payload, { headers: this.headers() })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible actualizar el rol.')),
      );
  }

  permissions() {
    return this.http
      .get<ApiResponse<Permission[]>>(`${API_BASE_URL}/identity/permissions`, { headers: this.headers() })
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible cargar permisos.')),
      );
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

          return this.handleApiError(error, 'No fue posible cargar las imágenes.');
        }),
      );
  }

  configurations() {
    return this.http
      .get<ApiResponse<Configuration[]>>(`${API_BASE_URL}/configurations`)
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible cargar configuraciones.')),
      );
  }

  upsertConfiguration(key: string, value: string, description: string | null) {
    return this.http
      .put<ApiResponse<Configuration>>(
        `${API_BASE_URL}/configurations/${encodeURIComponent(key)}`,
        { value, description },
        { headers: this.headers() },
      )
      .pipe(
        map((response) => this.unwrap(response)),
        catchError((error) => this.handleApiError(error, 'No fue posible guardar la configuración.')),
      );
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

  private handleApiError(error: unknown, fallbackMessage: string): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 429) {
        return throwError(
          () => new Error('No fue posible completar la acción. Espera un momento e intenta de nuevo.'),
        );
      }

      if (error.status === 401 || error.status === 403) {
        this.auth.logout();
        return throwError(
          () => new Error('Tu sesión venció o no tiene permisos para esta acción. Ingresa nuevamente.'),
        );
      }

      const apiError = error.error as Partial<ApiResponse<unknown>> | string | null;

      if (apiError && typeof apiError === 'object') {
        const message = this.toFriendlyApiMessage(apiError.error);
        if (message) {
          return throwError(() => new Error(message));
        }
      }

      if (typeof apiError === 'string' && apiError.trim()) {
        const message = this.toFriendlyApiMessage(apiError);
        return throwError(() => new Error(message ?? fallbackMessage));
      }
    }

    if (error instanceof Error && error.message && !error.message.includes('Http failure response')) {
      return throwError(() => error);
    }

    return throwError(() => new Error(fallbackMessage));
  }

  private toFriendlyApiMessage(message: string | null | undefined): string | null {
    if (!message?.trim()) {
      return null;
    }

    const normalized = message.trim();
    const knownMessages: Record<string, string> = {
      'Product slug already exists.': 'Ya existe un producto con ese slug.',
      'Product SKU already exists.': 'Ya existe un producto con ese SKU.',
      'Product not found.': 'No se encontró el producto.',
      'Category not found.': 'No se encontró la categoría.',
      'Inventory item not found.': 'No se encontró el ítem de inventario.',
      'Inventory stock cannot be negative.': 'La salida supera el stock disponible.',
      'Invoice file is required.': 'Selecciona una factura antes de subir.',
      'Invoice file size is not valid.': 'La factura supera el tamaño permitido o está vacía.',
      'Invoice file content type is not supported.': 'La factura debe ser PDF, JPG, PNG o WEBP.',
      'Invoice import not found.': 'No se encontró la factura cargada.',
      'Invoice import cannot be edited.': 'Esta factura ya no se puede editar.',
      'Invoice import has no ready lines.': 'Agrega al menos una línea lista antes de confirmar.',
      'Invoice line inventory item is required.': 'Selecciona un ítem de inventario para la línea.',
      'Invoice line quantity must be greater than zero.': 'La cantidad de la línea debe ser mayor a cero.',
      'User email already exists.': 'Ya existe un usuario con ese correo.',
      'Role name already exists.': 'Ya existe un rol con ese nombre.',
      'One or more permissions do not exist.': 'Uno o más permisos seleccionados no existen.',
      'One or more roles do not exist.': 'Uno o más roles seleccionados no existen.',
      'Invalid credentials.': 'Credenciales inválidas.',
    };

    return knownMessages[normalized] ?? normalized;
  }
}
