export interface ApiResponse<T> {
  succeeded: boolean;
  data: T | null;
  error: string | null;
}

export interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
}

export interface CategoryImage {
  id: string;
  categoryId: string;
  url: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  altText: string | null;
  sortOrder: number;
  storageProvider: string;
}

export interface CatalogCategory extends Category {
  images: CategoryImage[];
}

export interface CatalogImagesGroup {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  images: CategoryImage[];
}

export interface CatalogWarmup {
  categories: number;
  images: number;
  cachedAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price: number;
  isActive: boolean;
  categoryId: string | null;
  categoryName: string | null;
  imageUrls: string[];
}

export interface Configuration {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

export interface ProductPayload {
  name: string;
  slug: string | null;
  description: string | null;
  sku: string | null;
  price: number;
  isActive: boolean;
  categoryId: string | null;
}

export interface CategoryPayload {
  name: string;
  slug: string | null;
  description: string | null;
  isActive: boolean;
}

export interface RoleSummary {
  id: string;
  name: string;
}

export interface Permission {
  id: string;
  code: string;
  description: string;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roles: RoleSummary[];
}

export interface AdminUserPayload {
  email: string;
  fullName: string;
  password?: string | null;
  isActive: boolean;
  roleIds: string[];
}

export interface CreateAdminUserPayload extends AdminUserPayload {
  password: string;
}

export interface AdminRolePayload {
  name: string;
  description: string;
  permissionIds: string[];
}
