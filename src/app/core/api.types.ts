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
  categoryNumber: number;
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
  products: number;
  cachedAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  storageProvider: string;
}

export interface ProductCategory {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  sortOrder: number;
  isFeatured: boolean;
}

export interface Product {
  id: string;
  productNumber: number;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price: number;
  isActive: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categories: ProductCategory[];
  images: ProductImage[];
  imageUrls: string[];
}

export interface CatalogProductImage {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface CatalogProductCategory {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  sortOrder: number;
  isFeatured: boolean;
}

export interface CatalogProduct {
  id: string;
  productNumber: number;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price: number;
  categoryId: string | null;
  categoryName: string | null;
  categories: CatalogProductCategory[];
  images: CatalogProductImage[];
}

export interface ContactRequestPayload {
  fullName: string;
  email: string;
  phone: string | null;
  requestType: string;
  message: string;
  sourcePage: string;
  captchaToken: string | null;
  website: string | null;
}

export interface ContactRequestResponse {
  contactRequestNumber: number;
  status: string;
  receivedAt: string;
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

export type InventoryItemType = 'Product' | 'Supply' | 'Element';
export type InventoryMovementType = 'Entry' | 'Exit';

export interface InventoryItem {
  id: string;
  inventoryItemNumber: number;
  productId: string | null;
  productName: string | null;
  name: string;
  sku: string;
  type: InventoryItemType | string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  isActive: boolean;
  imageUrl: string | null;
  imageFileName: string | null;
  imageContentType: string | null;
  imageSizeBytes: number | null;
  isBelowMinimum: boolean;
}

export interface InventoryMovement {
  id: string;
  inventoryMovementNumber: number;
  inventoryItemId: string;
  movementType: InventoryMovementType | string;
  quantity: number;
  stockAfter: number;
  unitCost: number | null;
  reason: string | null;
  reference: string | null;
  occurredAt: string;
}

export interface InventoryItemPayload {
  productId: string | null;
  name: string;
  sku: string;
  type: InventoryItemType | string;
  unit: string;
  initialStock: number;
  minimumStock: number;
  isActive: boolean;
}

export interface InventoryItemUpdatePayload {
  productId: string | null;
  name: string;
  sku: string;
  type: InventoryItemType | string;
  unit: string;
  minimumStock: number;
  isActive: boolean;
}

export interface InventoryMovementPayload {
  movementType: InventoryMovementType | string;
  quantity: number;
  unitCost: number | null;
  reason: string | null;
  reference: string | null;
}

export interface InvoiceImport {
  id: string;
  invoiceImportNumber: number;
  status: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  url: string;
  supplierId: string | null;
  supplierName: string | null;
  supplierTaxId: string | null;
  supplierStatus: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  subtotal: number | null;
  taxTotal: number | null;
  total: number | null;
  extractionProvider: string | null;
  extractedJson: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
  lines: InvoiceImportLine[];
}

export interface InvoiceImportLine {
  id: string;
  lineNumber: number;
  status: string;
  matchStatus: string;
  matchConfidence: number;
  inventoryItemId: string | null;
  inventoryItemName: string | null;
  inventoryItemSku: string | null;
  rawText: string | null;
  extractedSku: string | null;
  extractedName: string;
  quantity: number;
  unitCost: number | null;
  taxPercent: number | null;
  taxAmount: number | null;
  lineTotal: number | null;
  notes: string | null;
}

export interface InvoiceImportLinePayload {
  inventoryItemId: string | null;
  rawText: string | null;
  extractedSku: string | null;
  extractedName: string;
  quantity: number;
  unitCost: number | null;
  taxPercent: number | null;
  taxAmount: number | null;
  lineTotal: number | null;
  notes: string | null;
  ignore: boolean;
}

export interface InvoiceExtractorStatus {
  provider: string;
  model: string;
  enabled: boolean;
  configured: boolean;
  available: boolean;
  status: string;
  message: string | null;
  lastErrorCode: string | null;
  lastCheckedAt: string | null;
}

export interface Supplier {
  id: string;
  supplierNumber: number;
  name: string;
  taxId: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  categoryId: string | null;
  categoryName: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface SupplierPayload {
  name: string;
  taxId: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  categoryId: string | null;
  status: string;
  notes: string | null;
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
