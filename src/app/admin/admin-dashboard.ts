import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { AdminApiService } from '../core/admin-api.service';
import { API_ORIGIN_URL } from '../core/api.config';
import {
  AdminRole,
  AdminRolePayload,
  AdminUser,
  AdminUserPayload,
  Category,
  CategoryImage,
  Configuration,
  CreateAdminUserPayload,
  InventoryItem,
  InventoryItemPayload,
  InventoryItemUpdatePayload,
  InvoiceImport,
  InvoiceExtractorStatus,
  InvoiceImportLine,
  InvoiceImportLinePayload,
  InventoryMovement,
  InventoryMovementPayload,
  InventoryMovementType,
  Permission,
  Product,
  ProductImage,
  ProductPayload,
  Supplier,
  SupplierPayload,
} from '../core/api.types';

type AdminTab = 'overview' | 'products' | 'inventory' | 'suppliers' | 'categories' | 'content' | 'images' | 'users';
type InventorySection = 'stock' | 'invoices';
type ToastType = 'success' | 'error' | 'info';
type ImageSelector = 'category' | 'product' | 'associate' | null;

interface AdminToast {
  type: ToastType;
  message: string;
}

interface StockReportByType {
  type: string;
  label: string;
  items: number;
  stock: number;
  lowStock: number;
}

interface AdminMenuAccess {
  tab: AdminTab;
  label: string;
  permissions: string[];
}

const INACTIVITY_CONFIGURATION_KEY = 'admin.session.inactivityMinutes';
const INVENTORY_SECTION_KEY = 'amas_admin_inventory_section';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnDestroy, OnInit {
  readonly inventoryPageSize = 8;
  readonly movementPageSize = 8;
  readonly menuAccessOptions: AdminMenuAccess[] = [
    { tab: 'overview', label: 'Resumen', permissions: [] },
    { tab: 'products', label: 'Productos', permissions: ['products.read'] },
    { tab: 'inventory', label: 'Kardex', permissions: ['inventory.read', 'inventory.invoices.read'] },
    { tab: 'suppliers', label: 'Proveedores', permissions: ['suppliers.read'] },
    { tab: 'categories', label: 'Categorías', permissions: ['categories.read'] },
    { tab: 'content', label: 'Landing', permissions: ['content.read'] },
    { tab: 'images', label: 'Imágenes', permissions: ['images.read'] },
    { tab: 'users', label: 'Usuarios', permissions: ['users.read'] },
  ];
  activeTab: AdminTab = 'overview';
  activeInventorySection: InventorySection = this.normalizeInventorySection(
    localStorage.getItem(INVENTORY_SECTION_KEY),
  );
  sidebarCollapsed = false;
  userMenuOpen = false;
  products: Product[] = [];
  inventoryItems: InventoryItem[] = [];
  inventoryMovements: InventoryMovement[] = [];
  invoiceImports: InvoiceImport[] = [];
  invoiceExtractorStatus: InvoiceExtractorStatus | null = null;
  suppliers: Supplier[] = [];
  categories: Category[] = [];
  configurations: Configuration[] = [];
  users: AdminUser[] = [];
  roles: AdminRole[] = [];
  permissions: Permission[] = [];
  loading = false;
  saving = false;
  error = '';
  toast: AdminToast | null = null;
  pendingAction = '';
  inventorySearch = '';
  movementSearch = '';
  inventoryPage = 1;
  movementPage = 1;
  selectedInvoiceImportId = '';
  selectedInvoiceFile: File | null = null;
  selectedInventoryItemImageFile: File | null = null;
  selectedInventoryItemImagePreview = '';
  editingInvoiceLineId: string | null = null;
  inactivityMinutes = 30;
  inactivityFormMinutes = 30;
  private inactivityTimerId: number | null = null;
  private toastTimeoutId: number | null = null;
  editingProductId: string | null = null;
  editingInventoryItemId: string | null = null;
  editingSupplierId: string | null = null;
  selectedInventoryItemId = '';
  editingCategoryId: string | null = null;
  isProductModalOpen = false;
  isInventoryItemModalOpen = false;
  isInventoryMovementModalOpen = false;
  isSupplierModalOpen = false;
  isCategoryModalOpen = false;
  isConfigurationModalOpen = false;
  isUserModalOpen = false;
  isRoleModalOpen = false;
  editingUserId: string | null = null;
  editingRoleId: string | null = null;
  imagePreview = '';
  selectedImageCategoryId = '';
  selectedImageProductId = '';
  selectedImageAssociateProductId = '';
  imageCategorySearch = '';
  imageProductSearch = '';
  imageAssociateProductSearch = '';
  openImageSelector: ImageSelector = null;
  categoryProducts: Product[] = [];
  selectedImageFiles: File[] = [];
  selectedImagePreviews: string[] = [];
  imageAltText = '';
  categoryImages: CategoryImage[] = [];
  productImages: ProductImage[] = [];
  imageUploadMessage = '';

  productForm: ProductPayload = this.emptyProduct();
  inventoryItemForm: InventoryItemPayload = this.emptyInventoryItem();
  inventoryMovementForm: InventoryMovementPayload = this.emptyInventoryMovement();
  invoiceUploadForm = this.emptyInvoiceUpload();
  invoiceLineForm: InvoiceImportLinePayload = this.emptyInvoiceLine();
  supplierForm: SupplierPayload = this.emptySupplier();
  categoryForm = {
    name: '',
    slug: '',
    description: '',
    isActive: true,
  };
  configurationForm = {
    key: 'landing.hero.title',
    value: '',
    description: 'Texto editable para la landing',
  };
  userForm: AdminUserPayload = this.emptyUser();
  roleForm: AdminRolePayload = this.emptyRole();

  constructor(
    private readonly api: AdminApiService,
    private readonly auth: AuthService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.resetInactivityTimer();
    this.refresh();
  }

  ngOnDestroy(): void {
    if (this.inactivityTimerId !== null) {
      window.clearTimeout(this.inactivityTimerId);
    }
  }

  @HostListener('document:click')
  @HostListener('document:keydown')
  @HostListener('document:mousemove')
  @HostListener('document:scroll')
  registerUserActivity(): void {
    this.resetInactivityTimer();
  }

  @HostListener('document:keydown.escape')
  closeSearchSelectorOnEscape(): void {
    this.closeImageSelector();
  }

  get activeProducts(): number {
    return this.products.filter((product) => product.isActive).length;
  }

  get inventoryValue(): number {
    return this.products.reduce((total, product) => total + Number(product.price || 0), 0);
  }

  get inventoryStockValue(): number {
    return this.inventoryItems.reduce((total, item) => total + Number(item.currentStock || 0), 0);
  }

  get lowStockItems(): number {
    return this.inventoryItems.filter((item) => item.isBelowMinimum).length;
  }

  get stockReportByType(): StockReportByType[] {
    return ['Product', 'Supply', 'Element'].map((type) => {
      const items = this.inventoryItems.filter((item) => item.type === type);

      return {
        type,
        label: this.inventoryTypeLabel(type),
        items: items.length,
        stock: items.reduce((total, item) => total + Number(item.currentStock || 0), 0),
        lowStock: items.filter((item) => item.isBelowMinimum).length,
      };
    });
  }

  get selectedInventoryItem(): InventoryItem | null {
    return this.inventoryItems.find((item) => item.id === this.selectedInventoryItemId) ?? null;
  }

  get selectedInvoiceImport(): InvoiceImport | null {
    return this.invoiceImports.find((item) => item.id === this.selectedInvoiceImportId) ?? null;
  }

  get selectedInvoiceReadyLines(): number {
    return this.selectedInvoiceImport?.lines.filter((line) => line.status === 'Ready').length ?? 0;
  }

  get selectedInvoicePendingLines(): number {
    return this.selectedInvoiceImport?.lines.filter((line) => line.status === 'NeedsReview').length ?? 0;
  }

  get canConfirmSelectedInvoice(): boolean {
    const selected = this.selectedInvoiceImport;
    return Boolean(
      selected &&
        selected.status !== 'Confirmed' &&
        selected.status !== 'Cancelled' &&
        selected.lines.some((line) => line.status === 'Ready'),
    );
  }

  get invoiceExtractorStatusClass(): string {
    const status = this.invoiceExtractorStatus;
    if (!status || !status.enabled || !status.configured) {
      return 'muted';
    }

    return status.available ? 'available' : 'blocked';
  }

  get invoiceExtractorStatusLabel(): string {
    const status = this.invoiceExtractorStatus;
    if (!status) {
      return 'Estado extractor: sin validar';
    }

    if (!status.enabled) {
      return 'Extractor OpenAI deshabilitado';
    }

    if (!status.configured) {
      return 'Extractor OpenAI sin API key';
    }

    if (!status.available) {
      return 'Extractor OpenAI sin cuota o con límite';
    }

    return 'Extractor OpenAI disponible';
  }

  get filteredInventoryItems(): InventoryItem[] {
    const term = this.normalizeSearch(this.inventorySearch);
    if (!term) {
      return this.inventoryItems;
    }

    return this.inventoryItems.filter((item) =>
      this.matchesSearch(
        [
          item.name,
          item.inventoryItemNumber,
          item.sku,
          item.productName,
          item.unit,
          item.type,
          this.inventoryTypeLabel(item.type),
          item.isBelowMinimum ? 'stock bajo' : 'disponible',
        ],
        term,
      ),
    );
  }

  get pagedInventoryItems(): InventoryItem[] {
    return this.paginate(this.filteredInventoryItems, this.inventoryPage, this.inventoryPageSize);
  }

  get inventoryTotalPages(): number {
    return this.totalPages(this.filteredInventoryItems.length, this.inventoryPageSize);
  }

  get filteredInventoryMovements(): InventoryMovement[] {
    const term = this.normalizeSearch(this.movementSearch);
    if (!term) {
      return this.inventoryMovements;
    }

    return this.inventoryMovements.filter((movement) =>
      this.matchesSearch(
        [
          this.movementLabel(movement.movementType),
          movement.inventoryMovementNumber,
          movement.quantity,
          movement.stockAfter,
          movement.unitCost,
          movement.reason,
          movement.reference,
          movement.occurredAt,
        ],
        term,
      ),
    );
  }

  get pagedInventoryMovements(): InventoryMovement[] {
    return this.paginate(this.filteredInventoryMovements, this.movementPage, this.movementPageSize);
  }

  get movementTotalPages(): number {
    return this.totalPages(this.filteredInventoryMovements.length, this.movementPageSize);
  }

  get userEmail(): string {
    return this.auth.userEmail();
  }

  refresh(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      products: this.api.products(),
      inventoryItems: this.api.inventoryItems(),
      invoiceImports: this.canAccessInventoryInvoices() ? this.api.invoiceImports() : of([]),
      invoiceExtractorStatus: this.canAccessInventoryInvoices()
        ? this.api.invoiceExtractorStatus().pipe(catchError(() => of(null)))
        : of(null),
      suppliers: this.hasPermission('suppliers.read') ? this.api.suppliers() : of([]),
      categories: this.api.categories(),
      configurations: this.api.configurations(),
      users: this.api.users(),
      roles: this.api.roles(),
      permissions: this.api.permissions(),
    }).subscribe({
      next: ({ products, inventoryItems, invoiceImports, invoiceExtractorStatus, suppliers, categories, configurations, users, roles, permissions }) => {
        this.products = products;
        this.inventoryItems = inventoryItems;
        this.invoiceImports = invoiceImports;
        this.invoiceExtractorStatus = invoiceExtractorStatus;
        this.suppliers = suppliers;
        this.categories = categories;
        this.configurations = configurations;
        this.users = users;
        this.roles = roles;
        this.permissions = permissions;
        this.applyInactivityConfiguration(configurations);
        this.clampInventoryPage();
        this.clampMovementPage();
        this.ensureSelectedInventoryItem(false);
        this.ensureSelectedInvoiceImport();
        this.ensureSelectedImageCategory();
        this.loading = false;
        this.updateView();
      },
      error: (error: Error) => {
        this.loading = false;
        this.error = error.message || 'No fue posible cargar la información del administrador.';
        this.showToast(this.error, 'error');
        this.updateView();
      },
    });
  }

  loadCategories(): void {
    this.loading = true;
    this.error = '';

    this.api.categories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.ensureSelectedImageCategory();
        this.loading = false;
        this.updateView();
      },
      error: (error: Error) => {
        this.loading = false;
        this.error = error.message || 'No fue posible cargar categorías.';
        this.showToast(this.error, 'error');
        this.updateView();
      },
    });
  }

  loadConfigurations(): void {
    this.loading = true;
    this.error = '';

    this.api.configurations().subscribe({
      next: (configurations) => {
        this.configurations = configurations;
        this.loading = false;
        this.updateView();
      },
      error: (error: Error) => {
        this.loading = false;
        this.error = error.message || 'No fue posible cargar configuraciones.';
        this.showToast(this.error, 'error');
        this.updateView();
      },
    });
  }

  saveProduct(): void {
    const isEditing = Boolean(this.editingProductId);
    this.startAction('saveProduct');
    this.error = '';
    const payload = this.normalizeProduct(this.productForm);
    const request = this.editingProductId
      ? this.api.updateProduct(this.editingProductId, payload)
      : this.api.createProduct(payload);

    request.subscribe({
      next: () => {
        const message = isEditing ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.';
        this.closeProductModal();
        this.refreshProductsAfterAction(message);
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'No fue posible guardar el producto.');
      },
    });
  }

  editProduct(product: Product): void {
    this.activeTab = 'products';
    this.editingProductId = product.id;
    this.productForm = {
      name: product.name,
      slug: product.slug,
      description: product.description,
      sku: product.sku,
      price: product.price,
      isActive: product.isActive,
      categoryId: product.categoryId,
    };
    this.isProductModalOpen = true;
  }

  openProductModal(): void {
    this.editingProductId = null;
    this.productForm = this.emptyProduct();
    this.isProductModalOpen = true;
  }

  closeProductModal(): void {
    this.editingProductId = null;
    this.productForm = this.emptyProduct();
    this.isProductModalOpen = false;
  }

  deleteProduct(product: Product): void {
    this.startAction(`deleteProduct:${product.id}`);

    this.api.deleteProduct(product.id).subscribe({
      next: () => {
        this.refreshProductsAfterAction('Producto eliminado correctamente.');
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'No fue posible eliminar el producto.');
      },
    });
  }

  openInventoryItemModal(): void {
    this.editingInventoryItemId = null;
    this.inventoryItemForm = this.emptyInventoryItem();
    this.clearInventoryItemImageSelection();
    this.isInventoryItemModalOpen = true;
  }

  editInventoryItem(item: InventoryItem): void {
    this.activeTab = 'inventory';
    this.editingInventoryItemId = item.id;
    this.inventoryItemForm = {
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      type: item.type,
      unit: item.unit,
      initialStock: item.currentStock,
      minimumStock: item.minimumStock,
      isActive: item.isActive,
    };
    this.selectedInventoryItemImagePreview = item.imageUrl ? this.inventoryItemImageUrl(item) : '';
    this.selectedInventoryItemImageFile = null;
    this.isInventoryItemModalOpen = true;
  }

  closeInventoryItemModal(): void {
    this.editingInventoryItemId = null;
    this.inventoryItemForm = this.emptyInventoryItem();
    this.clearInventoryItemImageSelection();
    this.isInventoryItemModalOpen = false;
  }

  saveInventoryItem(): void {
    const isEditing = Boolean(this.editingInventoryItemId);
    this.startAction('saveInventoryItem');
    const payload = this.normalizeInventoryItem(this.inventoryItemForm);
    const request = this.editingInventoryItemId
      ? this.api.updateInventoryItem(this.editingInventoryItemId, this.toInventoryUpdatePayload(payload))
      : this.api.createInventoryItem(payload);

    request.subscribe({
      next: (item) => {
        this.selectedInventoryItemId = item.id;
        this.uploadInventoryImageIfSelected(
          item.id,
          isEditing ? 'Ítem de inventario actualizado correctamente.' : 'Ítem de inventario creado correctamente.',
        );
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'No fue posible guardar el ítem de inventario.');
      },
    });
  }

  selectInventoryItemImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedInventoryItemImageFile = file;
    this.selectedInventoryItemImagePreview = '';

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.selectedInventoryItemImagePreview = String(reader.result);
      this.updateView();
    };
    reader.readAsDataURL(file);
  }

  deleteInventoryItemImage(item: InventoryItem): void {
    this.startAction(`deleteInventoryItemImage:${item.id}`);
    this.api.deleteInventoryItemImage(item.id).subscribe({
      next: () => {
        this.refreshInventoryAfterAction('Imagen del ítem eliminada correctamente.', true);
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'No fue posible eliminar la imagen del ítem.');
      },
    });
  }

  inventoryItemImageUrl(item: InventoryItem): string {
    if (!item.imageUrl) {
      return '';
    }

    return item.imageUrl.startsWith('http') ? item.imageUrl : `${API_ORIGIN_URL}${item.imageUrl}`;
  }

  selectInventoryItem(itemId: string): void {
    this.selectedInventoryItemId = itemId;
    this.movementSearch = '';
    this.movementPage = 1;
    this.loadInventoryMovements();
  }

  openInventoryMovementModal(type: InventoryMovementType): void {
    if (!this.selectedInventoryItemId) {
      this.showToast('Selecciona un ítem de inventario antes de registrar movimientos.', 'error');
      return;
    }

    this.inventoryMovementForm = {
      ...this.emptyInventoryMovement(),
      movementType: type,
    };
    this.isInventoryMovementModalOpen = true;
  }

  closeInventoryMovementModal(): void {
    this.inventoryMovementForm = this.emptyInventoryMovement();
    this.isInventoryMovementModalOpen = false;
  }

  saveInventoryMovement(): void {
    if (!this.selectedInventoryItemId) {
      this.finishActionWithError('Selecciona un ítem de inventario antes de registrar movimientos.');
      return;
    }

    this.startAction('saveInventoryMovement');
    this.api
      .createInventoryMovement(this.selectedInventoryItemId, this.normalizeInventoryMovement(this.inventoryMovementForm))
      .subscribe({
        next: () => {
          this.closeInventoryMovementModal();
          this.refreshInventoryAfterAction('Movimiento registrado correctamente.', true);
        },
        error: (error: Error) => {
          this.finishActionWithError(error.message || 'No fue posible registrar el movimiento.');
        },
      });
  }

  movementLabel(type: string): string {
    return type === 'Entry' ? 'Entrada' : 'Salida';
  }

  inventoryTypeLabel(type: string): string {
    if (type === 'Product') {
      return 'Producto';
    }

    if (type === 'Supply') {
      return 'Insumo';
    }

    if (type === 'Element') {
      return 'Elemento';
    }

    return type;
  }

  onInventorySearchChange(): void {
    this.inventoryPage = 1;
    this.updateView();
  }

  onMovementSearchChange(): void {
    this.movementPage = 1;
    this.updateView();
  }

  previousInventoryPage(): void {
    this.inventoryPage = Math.max(1, this.inventoryPage - 1);
  }

  nextInventoryPage(): void {
    this.inventoryPage = Math.min(this.inventoryTotalPages, this.inventoryPage + 1);
  }

  previousMovementPage(): void {
    this.movementPage = Math.max(1, this.movementPage - 1);
  }

  nextMovementPage(): void {
    this.movementPage = Math.min(this.movementTotalPages, this.movementPage + 1);
  }

  selectInvoiceFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedInvoiceFile = input.files?.[0] ?? null;
  }

  uploadInvoiceImport(): void {
    if (!this.canAccessInventoryInvoices()) {
      this.showToast('No tienes permisos para cargar facturas de entrada.', 'error');
      return;
    }

    if (!this.selectedInvoiceFile) {
      this.showToast('Selecciona una factura PDF o imagen antes de subir.', 'error');
      return;
    }

    this.startAction('uploadInvoiceImport');
    this.api.uploadInvoiceImport(this.selectedInvoiceFile, this.invoiceUploadForm).subscribe({
      next: (invoiceImport) => {
        this.invoiceImports = [invoiceImport, ...this.invoiceImports.filter((item) => item.id !== invoiceImport.id)];
        this.selectedInvoiceImportId = invoiceImport.id;
        this.selectedInvoiceFile = null;
        this.invoiceUploadForm = this.emptyInvoiceUpload();
        this.refreshInvoiceExtractorStatus();
        this.finishActionWithSuccess('Factura cargada para revisión.');
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'No fue posible subir la factura.');
      },
    });
  }

  selectInvoiceImport(importId: string): void {
    this.selectedInvoiceImportId = importId;
    this.editingInvoiceLineId = null;
    this.invoiceLineForm = this.emptyInvoiceLine();
  }

  editInvoiceLine(line: InvoiceImportLine): void {
    this.editingInvoiceLineId = line.id;
    this.invoiceLineForm = {
      inventoryItemId: line.inventoryItemId,
      rawText: line.rawText,
      extractedSku: line.extractedSku,
      extractedName: line.extractedName,
      quantity: line.quantity,
      unitCost: line.unitCost,
      taxPercent: line.taxPercent,
      taxAmount: line.taxAmount,
      lineTotal: line.lineTotal,
      notes: line.notes,
      ignore: line.status === 'Ignored',
    };
  }

  cancelInvoiceLineEdit(): void {
    this.editingInvoiceLineId = null;
    this.invoiceLineForm = this.emptyInvoiceLine();
  }

  saveInvoiceLine(): void {
    if (!this.canAccessInventoryInvoices()) {
      this.showToast('No tienes permisos para editar facturas de entrada.', 'error');
      return;
    }

    if (!this.selectedInvoiceImportId) {
      this.showToast('Selecciona una factura antes de agregar líneas.', 'error');
      return;
    }

    this.startAction('saveInvoiceLine');
    const payload = this.normalizeInvoiceLine(this.invoiceLineForm);
    const request = this.editingInvoiceLineId
      ? this.api.updateInvoiceImportLine(this.selectedInvoiceImportId, this.editingInvoiceLineId, payload)
      : this.api.addInvoiceImportLine(this.selectedInvoiceImportId, payload);

    request.subscribe({
      next: () => {
        this.cancelInvoiceLineEdit();
        this.refreshInvoiceImportsAfterAction('Línea de factura guardada correctamente.');
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'No fue posible guardar la línea de factura.');
      },
    });
  }

  confirmInvoiceImport(): void {
    if (!this.canAccessInventoryInvoices()) {
      this.showToast('No tienes permisos para confirmar facturas de entrada.', 'error');
      return;
    }

    if (!this.selectedInvoiceImportId) {
      this.showToast('Selecciona una factura para confirmar.', 'error');
      return;
    }

    this.startAction('confirmInvoiceImport');
    this.api.confirmInvoiceImport(this.selectedInvoiceImportId).subscribe({
      next: () => {
        forkJoin({
          invoiceImports: this.api.invoiceImports(),
          inventoryItems: this.api.inventoryItems(),
        }).subscribe({
          next: ({ invoiceImports, inventoryItems }) => {
            this.invoiceImports = invoiceImports;
            this.inventoryItems = inventoryItems;
            this.ensureSelectedInvoiceImport();
            this.finishActionWithSuccess('Factura confirmada y entradas Kardex generadas.');
          },
          error: (error: Error) => {
            this.finishActionWithError(error.message || 'La factura se confirmó, pero no fue posible refrescar inventario.');
          },
        });
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'No fue posible confirmar la factura.');
      },
    });
  }

  cancelInvoiceImport(): void {
    if (!this.canAccessInventoryInvoices()) {
      this.showToast('No tienes permisos para cancelar facturas de entrada.', 'error');
      return;
    }

    if (!this.selectedInvoiceImportId) {
      this.showToast('Selecciona una factura para cancelar.', 'error');
      return;
    }

    this.startAction('cancelInvoiceImport');
    this.api.cancelInvoiceImport(this.selectedInvoiceImportId).subscribe({
      next: () => {
        this.refreshInvoiceImportsAfterAction('Factura cancelada correctamente.');
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'No fue posible cancelar la factura.');
      },
    });
  }

  saveSupplier(): void {
    const isEditing = Boolean(this.editingSupplierId);
    this.startAction('saveSupplier');
    const payload = this.normalizeSupplier(this.supplierForm);
    const request = this.editingSupplierId
      ? this.api.updateSupplier(this.editingSupplierId, payload)
      : this.api.createSupplier(payload);

    request.subscribe({
      next: () => {
        const message = isEditing ? 'Proveedor actualizado correctamente.' : 'Proveedor creado correctamente.';
        this.closeSupplierModal();
        this.refreshSuppliersAfterAction(message);
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'No fue posible guardar el proveedor.');
      },
    });
  }

  openSupplierModal(): void {
    this.editingSupplierId = null;
    this.supplierForm = this.emptySupplier();
    this.isSupplierModalOpen = true;
  }

  editSupplier(supplier: Supplier): void {
    this.editingSupplierId = supplier.id;
    this.supplierForm = {
      name: supplier.name,
      taxId: supplier.taxId,
      contactName: supplier.contactName,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      country: supplier.country,
      categoryId: supplier.categoryId,
      status: supplier.status,
      notes: supplier.notes,
    };
    this.isSupplierModalOpen = true;
  }

  closeSupplierModal(): void {
    this.editingSupplierId = null;
    this.supplierForm = this.emptySupplier();
    this.isSupplierModalOpen = false;
  }

  saveCategory(): void {
    const isEditing = Boolean(this.editingCategoryId);
    this.startAction('saveCategory');
    const payload = {
      name: this.categoryForm.name,
      slug: this.categoryForm.slug || null,
      description: this.categoryForm.description || null,
      isActive: this.categoryForm.isActive,
    };
    const request = this.editingCategoryId
      ? this.api.updateCategory(this.editingCategoryId, payload)
      : this.api.createCategory(payload);

    request.subscribe({
      next: () => {
        const message = isEditing ? 'Categoría actualizada correctamente.' : 'Categoría creada correctamente.';
        this.closeCategoryModal();
        this.refreshCategoriesAfterAction(message);
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'No fue posible guardar la categoría.');
      },
    });
  }

  openCategoryModal(): void {
    this.editingCategoryId = null;
    this.categoryForm = { name: '', slug: '', description: '', isActive: true };
    this.isCategoryModalOpen = true;
  }

  editCategory(category: Category): void {
    this.editingCategoryId = category.id;
    this.categoryForm = {
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      isActive: category.isActive,
    };
    this.isCategoryModalOpen = true;
  }

  closeCategoryModal(): void {
    this.editingCategoryId = null;
    this.categoryForm = { name: '', slug: '', description: '', isActive: true };
    this.isCategoryModalOpen = false;
  }

  deleteCategory(category: Category): void {
    this.startAction(`deleteCategory:${category.id}`);

    this.api.deleteCategory(category.id).subscribe({
      next: () => {
        this.refreshCategoriesAfterAction('Categoría eliminada correctamente.');
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'No fue posible eliminar la categoría.');
      },
    });
  }

  saveConfiguration(): void {
    this.startAction('saveConfiguration');

    this.api
      .upsertConfiguration(
        this.configurationForm.key,
        this.configurationForm.value,
        this.configurationForm.description || null,
      )
      .subscribe({
        next: () => {
          this.isConfigurationModalOpen = false;
          this.refreshConfigurationsAfterAction('Contenido actualizado correctamente.');
        },
        error: (error: Error) => {
          this.finishActionWithError(error.message || 'No fue posible guardar el contenido.');
        },
      });
  }

  openConfigurationModal(configuration?: Configuration): void {
    this.configurationForm = configuration
      ? {
          key: configuration.key,
          value: configuration.value,
          description: configuration.description || '',
        }
      : {
          key: 'landing.hero.title',
          value: '',
          description: 'Texto editable para la landing',
        };
    this.isConfigurationModalOpen = true;
  }

  closeConfigurationModal(): void {
    this.isConfigurationModalOpen = false;
  }

  saveInactivityConfiguration(): void {
    const minutes = Math.min(240, Math.max(5, Number(this.inactivityFormMinutes || 30)));
    this.startAction('saveInactivityConfiguration');

    this.api
      .upsertConfiguration(
        INACTIVITY_CONFIGURATION_KEY,
        String(minutes),
        'Tiempo global de inactividad del administrador en minutos.',
      )
      .subscribe({
        next: () => {
          this.inactivityMinutes = minutes;
          this.inactivityFormMinutes = minutes;
          this.resetInactivityTimer();
          this.refreshConfigurationsAfterAction('Tiempo de inactividad actualizado correctamente.');
        },
        error: (error: Error) => {
          this.finishActionWithError(error.message || 'No fue posible guardar el tiempo de inactividad.');
        },
      });
  }

  saveUser(): void {
    const isEditing = Boolean(this.editingUserId);
    this.startAction('saveUser');
    const payload = {
      ...this.userForm,
      password: this.userForm.password || null,
      roleIds: this.userForm.roleIds ?? [],
    };
    const request = this.editingUserId
      ? this.api.updateUser(this.editingUserId, payload)
      : this.api.createUser({ ...payload, password: payload.password ?? '' } as CreateAdminUserPayload);

    request.subscribe({
      next: () => {
        const message = isEditing ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.';
        this.closeUserModal();
        this.refreshIdentityAfterAction(message);
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'No fue posible guardar el usuario.');
      },
    });
  }

  openUserModal(): void {
    this.editingUserId = null;
    this.userForm = this.emptyUser();
    this.isUserModalOpen = true;
  }

  editUser(user: AdminUser): void {
    this.editingUserId = user.id;
    this.userForm = {
      email: user.email,
      fullName: user.fullName,
      password: null,
      isActive: user.isActive,
      roleIds: user.roles.map((role) => role.id),
    };
    this.isUserModalOpen = true;
  }

  closeUserModal(): void {
    this.editingUserId = null;
    this.userForm = this.emptyUser();
    this.isUserModalOpen = false;
  }

  toggleUserRole(roleId: string, event: Event): void {
    const checked = this.isChecked(event);
    const selected = new Set(this.userForm.roleIds ?? []);

    if (checked) {
      selected.add(roleId);
    } else {
      selected.delete(roleId);
    }

    this.userForm.roleIds = Array.from(selected);
  }

  userHasRole(roleId: string): boolean {
    return (this.userForm.roleIds ?? []).includes(roleId);
  }

  toggleRolePermission(permissionId: string, event: Event): void {
    const checked = this.isChecked(event);
    const selected = new Set(this.roleForm.permissionIds ?? []);

    if (checked) {
      selected.add(permissionId);
    } else {
      selected.delete(permissionId);
    }

    this.roleForm.permissionIds = Array.from(selected);
  }

  roleHasPermission(permissionId: string): boolean {
    return (this.roleForm.permissionIds ?? []).includes(permissionId);
  }

  canAccess(tab: AdminTab): boolean {
    const option = this.menuAccessOptions.find((item) => item.tab === tab);
    return option ? this.hasAnyPermission(option.permissions) : false;
  }

  hasPermission(permission: string): boolean {
    return this.auth.hasPermission(permission);
  }

  userMenuAccess(user: AdminUser): string {
    const codes = new Set(
      user.roles
        .flatMap((role) => this.roles.find((item) => item.id === role.id)?.permissions ?? [])
        .map((permission) => permission.code),
    );

    return this.menuLabelsForPermissions(codes).join(', ') || 'Sin accesos';
  }

  selectedUserMenuAccess(): string[] {
    const codes = new Set(
      (this.userForm.roleIds ?? [])
        .flatMap((roleId) => this.roles.find((role) => role.id === roleId)?.permissions ?? [])
        .map((permission) => permission.code),
    );

    return this.menuLabelsForPermissions(codes);
  }

  roleMenuAccess(): string[] {
    const codes = new Set(
      (this.roleForm.permissionIds ?? [])
        .map((permissionId) => this.permissions.find((permission) => permission.id === permissionId)?.code)
        .filter((code): code is string => Boolean(code)),
    );

    return this.menuLabelsForPermissions(codes);
  }

  saveRole(): void {
    const isEditing = Boolean(this.editingRoleId);
    this.startAction('saveRole');
    const request = this.editingRoleId
      ? this.api.updateRole(this.editingRoleId, this.roleForm)
      : this.api.createRole(this.roleForm);

    request.subscribe({
      next: () => {
        const message = isEditing ? 'Rol actualizado correctamente.' : 'Rol creado correctamente.';
        this.closeRoleModal();
        this.refreshIdentityAfterAction(message);
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'No fue posible guardar el rol.');
      },
    });
  }

  openRoleModal(): void {
    this.editingRoleId = null;
    this.roleForm = this.emptyRole();
    this.isRoleModalOpen = true;
  }

  editRole(role: AdminRole): void {
    this.editingRoleId = role.id;
    this.roleForm = {
      name: role.name,
      description: role.description,
      permissionIds: role.permissions.map((permission) => permission.id),
    };
    this.isRoleModalOpen = true;
  }

  closeRoleModal(): void {
    this.editingRoleId = null;
    this.roleForm = this.emptyRole();
    this.isRoleModalOpen = false;
  }

  permissionLabel(permission: Permission): string {
    return `${permission.code} · ${permission.description}`;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  openInventoryTab(): void {
    this.activeTab = 'inventory';
    this.ensureAllowedInventorySection();
    if (this.activeInventorySection === 'stock') {
      this.ensureSelectedInventoryItem(true);
    }
  }

  activateInventorySection(section: InventorySection): void {
    if (section === 'stock' && !this.canAccessInventoryStock()) {
      this.showToast('No tienes permisos para acceder al Kardex de inventario.', 'error');
      return;
    }

    if (section === 'invoices' && !this.canAccessInventoryInvoices()) {
      this.showToast('No tienes permisos para acceder a facturas de entrada.', 'error');
      return;
    }

    this.activeInventorySection = section;
    localStorage.setItem(INVENTORY_SECTION_KEY, section);

    if (section === 'stock') {
      this.ensureSelectedInventoryItem(true);
    } else {
      this.ensureSelectedInvoiceImport();
      this.refreshInvoiceExtractorStatus();
    }

    this.updateView();
  }

  canAccessInventoryStock(): boolean {
    return this.hasPermission('inventory.read');
  }

  canAccessInventoryInvoices(): boolean {
    return this.hasPermission('inventory.invoices.read');
  }

  onImageCategoryChange(): void {
    this.clearSelectedImages();
    this.selectedImageProductId = '';
    this.selectedImageAssociateProductId = '';
    this.imageProductSearch = '';
    this.imageAssociateProductSearch = '';
    this.productImages = [];
    this.loadCategoryProducts();
  }

  onImageProductChange(): void {
    this.clearSelectedImages();
    this.loadProductImages();
  }

  get availableProductsForSelectedImageCategory(): Product[] {
    const linkedIds = new Set(this.categoryProducts.map((product) => product.id));
    return this.products.filter((product) => !linkedIds.has(product.id));
  }

  get filteredImageCategories(): Category[] {
    const term = this.normalizeSearch(this.imageCategorySearch);
    const items = term
      ? this.categories.filter((category) =>
          this.matchesSearch([category.categoryNumber, category.name, category.slug, category.description], term),
        )
      : this.categories;

    return this.withSelectedOption(items, this.categories, this.selectedImageCategoryId, 80, !term);
  }

  get filteredCategoryProducts(): Product[] {
    const term = this.normalizeSearch(this.imageProductSearch);
    const items = term
      ? this.categoryProducts.filter((product) => this.productMatchesSearch(product, term))
      : this.categoryProducts;

    return this.withSelectedOption(items, this.categoryProducts, this.selectedImageProductId, 80, !term);
  }

  get filteredAvailableProductsForSelectedImageCategory(): Product[] {
    const term = this.normalizeSearch(this.imageAssociateProductSearch);
    const availableProducts = this.availableProductsForSelectedImageCategory;
    const items = term
      ? availableProducts.filter((product) => this.productMatchesSearch(product, term))
      : availableProducts;

    return this.withSelectedOption(items, availableProducts, this.selectedImageAssociateProductId, 80, !term);
  }

  selectedImageCategoryLabel(): string {
    return this.categories.find((category) => category.id === this.selectedImageCategoryId)?.name ?? 'Selecciona una categoría';
  }

  selectedImageProductLabel(): string {
    const product = this.categoryProducts.find((item) => item.id === this.selectedImageProductId);
    return product ? this.productOptionLabel(product) : 'Selecciona un producto';
  }

  selectedAssociateProductLabel(): string {
    const product = this.availableProductsForSelectedImageCategory.find((item) => item.id === this.selectedImageAssociateProductId);
    return product ? this.productOptionLabel(product) : 'Selecciona un producto';
  }

  productOptionLabel(product: Product): string {
    return `#${product.productNumber} · ${product.name}${product.sku ? ` · ${product.sku}` : ''}`;
  }

  toggleImageSelector(selector: Exclude<ImageSelector, null>): void {
    this.openImageSelector = this.openImageSelector === selector ? null : selector;
  }

  closeImageSelector(): void {
    this.openImageSelector = null;
  }

  selectImageCategory(categoryId: string): void {
    this.selectedImageCategoryId = categoryId;
    this.closeImageSelector();
    this.onImageCategoryChange();
  }

  selectImageProduct(productId: string): void {
    this.selectedImageProductId = productId;
    this.closeImageSelector();
    this.onImageProductChange();
  }

  selectAssociateProduct(productId: string): void {
    this.selectedImageAssociateProductId = productId;
    this.closeImageSelector();
  }

  isActionPending(action: string): boolean {
    return this.pendingAction === action;
  }

  dismissToast(): void {
    this.toast = null;
    if (this.toastTimeoutId !== null) {
      window.clearTimeout(this.toastTimeoutId);
      this.toastTimeoutId = null;
    }
  }

  selectImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    if (files.length === 0) {
      this.clearSelectedImages();
      return;
    }

    this.selectedImageFiles = files;
    this.selectedImagePreviews = [];
    this.imagePreview = '';

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const preview = String(reader.result);
        this.selectedImagePreviews = [...this.selectedImagePreviews, preview];
        if (!this.imagePreview) {
          this.imagePreview = preview;
        }
      };
      reader.readAsDataURL(file);
    });
  }

  uploadImages(): void {
    if (!this.selectedImageCategoryId) {
      this.imageUploadMessage = 'Selecciona una categoría antes de subir imágenes.';
      this.showToast('Selecciona una categoría antes de subir imágenes.', 'error');
      return;
    }

    if (!this.selectedImageProductId) {
      this.imageUploadMessage = 'Selecciona un producto antes de subir imágenes.';
      this.showToast('Selecciona un producto antes de subir imágenes.', 'error');
      return;
    }

    if (this.selectedImageFiles.length === 0) {
      this.imageUploadMessage = 'Selecciona al menos una imagen para cargar.';
      this.showToast('Selecciona al menos una imagen para cargar.', 'error');
      return;
    }

    this.imageUploadMessage = 'Cargando imágenes...';
    this.startAction('uploadProductImages');
    this.updateView();
    this.api
      .uploadProductImages(
        this.selectedImageProductId,
        this.selectedImageFiles,
        this.imageAltText || null,
      )
      .subscribe({
        next: (uploadedImages) => {
          this.clearSelectedImages();
          this.productImages = uploadedImages;
          this.imageUploadMessage =
            uploadedImages.length === 1
              ? 'Imagen cargada correctamente.'
              : `${uploadedImages.length} imágenes cargadas correctamente.`;
          this.finishActionWithSuccess(
            this.imageUploadMessage,
          );
          this.loadProductImages(false);
          this.updateView();
        },
        error: (error: Error) => {
          this.imageUploadMessage = error.message || 'No fue posible cargar las imágenes.';
          this.finishActionWithError(this.imageUploadMessage);
          this.updateView();
        },
      });
  }

  associateSelectedProductToImageCategory(): void {
    if (!this.selectedImageCategoryId || !this.selectedImageAssociateProductId) {
      this.showToast('Selecciona categoría y producto para asociar.', 'error');
      return;
    }

    this.startAction('associateProductToCategory');
    this.api.addProductToCategory(this.selectedImageCategoryId, this.selectedImageAssociateProductId).subscribe({
      next: (product) => {
        this.selectedImageProductId = product.id;
        this.selectedImageAssociateProductId = '';
        this.finishActionWithSuccess('Producto asociado a la categoría.');
        this.loadCategoryProducts(false);
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'No fue posible asociar el producto.');
      },
    });
  }

  imageUrl(image: CategoryImage): string {
    return image.url.startsWith('http') ? image.url : `${API_ORIGIN_URL}${image.url}`;
  }

  productImageUrl(image: ProductImage): string {
    return image.url.startsWith('http') ? image.url : `${API_ORIGIN_URL}${image.url}`;
  }

  moveProductImage(image: ProductImage, direction: -1 | 1): void {
    const currentIndex = this.productImages.findIndex((item) => item.id === image.id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= this.productImages.length || !this.selectedImageProductId) {
      return;
    }

    const reordered = [...this.productImages];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
    const payload = reordered.map((item, index) => ({ imageId: item.id, sortOrder: index + 1 }));

    this.startAction('reorderProductImages');
    this.api.reorderProductImages(this.selectedImageProductId, payload).subscribe({
      next: (images) => {
        this.productImages = images;
        this.finishActionWithSuccess('Orden de imágenes actualizado.');
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'No fue posible ordenar las imágenes.');
      },
    });
  }

  setPrimaryProductImage(image: ProductImage): void {
    if (!this.selectedImageProductId) {
      return;
    }

    this.startAction(`primaryProductImage:${image.id}`);
    this.api.setPrimaryProductImage(this.selectedImageProductId, image.id).subscribe({
      next: () => {
        this.loadProductImages(false);
        this.finishActionWithSuccess('Imagen principal actualizada.');
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'No fue posible marcar la imagen principal.');
      },
    });
  }

  deleteProductImage(image: ProductImage): void {
    if (!this.selectedImageProductId) {
      return;
    }

    this.startAction(`deleteProductImage:${image.id}`);
    this.api.deleteProductImage(this.selectedImageProductId, image.id).subscribe({
      next: () => {
        this.productImages = this.productImages.filter((item) => item.id !== image.id);
        this.finishActionWithSuccess('Imagen eliminada correctamente.');
        this.loadProductImages(false);
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'No fue posible eliminar la imagen.');
      },
    });
  }

  logout(): void {
    this.auth.logout();
  }

  activateTab(tab: AdminTab): void {
    if (!this.canAccess(tab)) {
      this.showToast('No tienes permisos para acceder a esta opción.', 'error');
      return;
    }

    if (tab === 'inventory') {
      this.openInventoryTab();
      return;
    }

    this.activeTab = tab;
  }

  private showToast(message: string, type: ToastType): void {
    this.toast = { message, type };
    if (this.toastTimeoutId !== null) {
      window.clearTimeout(this.toastTimeoutId);
    }

    this.toastTimeoutId = window.setTimeout(() => {
      this.toast = null;
      this.toastTimeoutId = null;
    }, 3600);
  }

  private startAction(action: string): void {
    this.saving = true;
    this.loading = true;
    this.pendingAction = action;
    this.error = '';
    this.updateView();
  }

  private finishActionWithSuccess(message: string): void {
    this.saving = false;
    this.loading = false;
    this.pendingAction = '';
    this.showToast(message, 'success');
    this.updateView();
  }

  private finishActionWithError(message: string): void {
    this.saving = false;
    this.loading = false;
    this.pendingAction = '';
    this.error = message;
    if (message !== this.imageUploadMessage && this.activeTab === 'images') {
      this.imageUploadMessage = message;
    }
    this.showToast(message, 'error');
    this.updateView();
  }

  private paginate<T>(items: T[], page: number, pageSize: number): T[] {
    const start = (Math.max(1, page) - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }

  private totalPages(totalItems: number, pageSize: number): number {
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }

  private normalizeSearch(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  private matchesSearch(values: unknown[], term: string): boolean {
    const tokens = term.split(' ').filter(Boolean);
    if (tokens.length === 0) {
      return true;
    }

    const searchableText = values.map((value) => this.normalizeSearch(value)).join(' ');
    return tokens.every((token) => searchableText.includes(token));
  }

  private productMatchesSearch(product: Product, term: string): boolean {
    return this.matchesSearch(
      [
        product.productNumber,
        product.name,
        product.slug,
        product.sku,
        product.categoryName,
        ...(product.categories ?? []).flatMap((category) => [
          category.categoryName,
          category.categorySlug,
        ]),
      ],
      term,
    );
  }

  private withSelectedOption<T extends { id: string }>(
    items: T[],
    source: T[],
    selectedId: string,
    limit = 80,
    includeSelected = true,
  ): T[] {
    const limitedItems = items.slice(0, limit);
    if (!includeSelected || !selectedId || limitedItems.some((item) => item.id === selectedId)) {
      return limitedItems;
    }

    const selectedItem = source.find((item) => item.id === selectedId);
    return selectedItem ? [selectedItem, ...limitedItems] : limitedItems;
  }

  private clampInventoryPage(): void {
    this.inventoryPage = Math.min(Math.max(1, this.inventoryPage), this.inventoryTotalPages);
  }

  private clampMovementPage(): void {
    this.movementPage = Math.min(Math.max(1, this.movementPage), this.movementTotalPages);
  }

  private applyInactivityConfiguration(configurations: Configuration[]): void {
    const value = configurations.find((configuration) => configuration.key === INACTIVITY_CONFIGURATION_KEY)?.value;
    const minutes = Number(value || this.inactivityMinutes);
    this.inactivityMinutes = Number.isFinite(minutes) ? Math.min(240, Math.max(5, minutes)) : 30;
    this.inactivityFormMinutes = this.inactivityMinutes;
    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimerId !== null) {
      window.clearTimeout(this.inactivityTimerId);
    }

    const timeoutMs = Math.min(240, Math.max(5, this.inactivityMinutes)) * 60 * 1000;
    this.inactivityTimerId = window.setTimeout(() => {
      this.showToast('La sesión se cerró por inactividad.', 'info');
      this.auth.logout();
    }, timeoutMs);
  }

  private hasAnyPermission(permissions: string[]): boolean {
    if (permissions.length === 0) {
      return true;
    }

    return permissions.some((permission) => this.auth.hasPermission(permission));
  }

  private ensureAllowedInventorySection(): void {
    if (this.activeInventorySection === 'stock' && this.canAccessInventoryStock()) {
      return;
    }

    if (this.activeInventorySection === 'invoices' && this.canAccessInventoryInvoices()) {
      return;
    }

    this.activeInventorySection = this.canAccessInventoryStock() ? 'stock' : 'invoices';
    localStorage.setItem(INVENTORY_SECTION_KEY, this.activeInventorySection);
  }

  private normalizeInventorySection(value: string | null): InventorySection {
    return value === 'invoices' ? 'invoices' : 'stock';
  }

  private menuLabelsForPermissions(codes: Set<string>): string[] {
    if (codes.has('admin.full_access')) {
      return this.menuAccessOptions.map((option) => option.label);
    }

    return this.menuAccessOptions
      .filter((option) => option.permissions.length === 0 || option.permissions.some((permission) => codes.has(permission)))
      .map((option) => option.label);
  }

  private isChecked(event: Event): boolean {
    return event.target instanceof HTMLInputElement ? event.target.checked : false;
  }

  private refreshProductsAfterAction(message: string): void {
    forkJoin({
      products: this.api.products(),
      categories: this.api.categories(),
    }).subscribe({
      next: ({ products, categories }) => {
        this.products = products;
        this.categories = categories;
        this.finishActionWithSuccess(message);
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'La acción se realizó, pero no fue posible refrescar la lista.');
      },
    });
  }

  private refreshInventoryAfterAction(message: string, reloadMovements: boolean): void {
    this.api.inventoryItems().subscribe({
      next: (items) => {
        this.inventoryItems = items;
        this.clampInventoryPage();
        this.ensureSelectedInventoryItem(reloadMovements);
        this.finishActionWithSuccess(message);
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'La acción se realizó, pero no fue posible refrescar inventario.');
      },
    });
  }

  private refreshInvoiceImportsAfterAction(message: string): void {
    forkJoin({
      invoiceImports: this.api.invoiceImports(),
      suppliers: this.hasPermission('suppliers.read') ? this.api.suppliers() : of(this.suppliers),
    }).subscribe({
      next: ({ invoiceImports, suppliers }) => {
        this.invoiceImports = invoiceImports;
        this.suppliers = suppliers;
        this.ensureSelectedInvoiceImport();
        this.finishActionWithSuccess(message);
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'La acción se realizó, pero no fue posible refrescar facturas.');
      },
    });
  }

  private refreshSuppliersAfterAction(message: string): void {
    this.api.suppliers().subscribe({
      next: (suppliers) => {
        this.suppliers = suppliers;
        this.finishActionWithSuccess(message);
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'La acción se realizó, pero no fue posible refrescar proveedores.');
      },
    });
  }

  private refreshInvoiceExtractorStatus(): void {
    this.api.invoiceExtractorStatus().subscribe({
      next: (status) => {
        this.invoiceExtractorStatus = status;
        this.updateView();
      },
      error: () => {
        this.updateView();
      },
    });
  }

  private refreshCategoriesAfterAction(message: string): void {
    this.api.categories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.ensureSelectedImageCategory();
        this.finishActionWithSuccess(message);
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'La acción se realizó, pero no fue posible refrescar categorías.');
      },
    });
  }

  private refreshConfigurationsAfterAction(message: string): void {
    this.api.configurations().subscribe({
      next: (configurations) => {
        this.configurations = configurations;
        this.finishActionWithSuccess(message);
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'La acción se realizó, pero no fue posible refrescar contenido.');
      },
    });
  }

  private refreshIdentityAfterAction(message: string): void {
    forkJoin({
      users: this.api.users(),
      roles: this.api.roles(),
      permissions: this.api.permissions(),
    }).subscribe({
      next: ({ users, roles, permissions }) => {
        this.users = users;
        this.roles = roles;
        this.permissions = permissions;
        this.finishActionWithSuccess(message);
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'La acción se realizó, pero no fue posible refrescar usuarios.');
      },
    });
  }

  private ensureSelectedImageCategory(): void {
    if (this.categories.length === 0) {
      this.selectedImageCategoryId = '';
      this.selectedImageProductId = '';
      this.categoryProducts = [];
      this.productImages = [];
      return;
    }

    const selectedExists = this.categories.some((category) => category.id === this.selectedImageCategoryId);
    if (!selectedExists) {
      this.selectedImageCategoryId = this.categories[0].id;
    }

    this.loadCategoryProducts(false);
  }

  private ensureSelectedInventoryItem(loadMovements: boolean): void {
    if (this.inventoryItems.length === 0) {
      this.selectedInventoryItemId = '';
      this.inventoryMovements = [];
      this.clampInventoryPage();
      this.clampMovementPage();
      return;
    }

    const selectedExists = this.inventoryItems.some((item) => item.id === this.selectedInventoryItemId);
    if (!selectedExists) {
      this.selectedInventoryItemId = this.inventoryItems[0].id;
    }

    if (loadMovements) {
      this.loadInventoryMovements(false);
    }
  }

  private ensureSelectedInvoiceImport(): void {
    if (this.invoiceImports.length === 0) {
      this.selectedInvoiceImportId = '';
      return;
    }

    const selectedExists = this.invoiceImports.some((item) => item.id === this.selectedInvoiceImportId);
    if (!selectedExists) {
      this.selectedInvoiceImportId = this.invoiceImports[0].id;
    }
  }

  private loadInventoryMovements(showLoading = true): void {
    if (!this.selectedInventoryItemId) {
      this.inventoryMovements = [];
      return;
    }

    if (showLoading) {
      this.loading = true;
      this.updateView();
    }

    this.api.inventoryMovements(this.selectedInventoryItemId).subscribe({
      next: (movements) => {
        this.inventoryMovements = movements;
        this.clampMovementPage();
        if (showLoading) {
          this.loading = false;
        }
        this.updateView();
      },
      error: (error: Error) => {
        this.inventoryMovements = [];
        this.clampMovementPage();
        if (showLoading) {
          this.loading = false;
        }
        this.showToast(error.message || 'No fue posible cargar el Kardex.', 'error');
        this.updateView();
      },
    });
  }

  private loadCategoryProducts(showLoading = true): void {
    if (!this.selectedImageCategoryId) {
      this.categoryProducts = [];
      this.selectedImageProductId = '';
      this.productImages = [];
      return;
    }

    if (showLoading) {
      this.loading = true;
    }

    this.api.productsByCategory(this.selectedImageCategoryId).subscribe({
      next: (products) => {
        this.categoryProducts = products;
        const selectedExists = products.some((product) => product.id === this.selectedImageProductId);
        this.selectedImageProductId = selectedExists ? this.selectedImageProductId : products[0]?.id ?? '';
        this.loadProductImages(false);
        if (showLoading) {
          this.loading = false;
        }
        this.updateView();
      },
      error: (error: Error) => {
        this.categoryProducts = [];
        this.selectedImageProductId = '';
        this.productImages = [];
        if (showLoading) {
          this.loading = false;
        }
        this.showToast(error.message || 'No fue posible cargar productos de la categoría.', 'error');
        this.updateView();
      },
    });
  }

  private loadProductImages(showLoading = true): void {
    if (!this.selectedImageProductId) {
      this.productImages = [];
      return;
    }

    if (showLoading) {
      this.loading = true;
    }

    this.api.productImages(this.selectedImageProductId).subscribe({
      next: (images) => {
        this.productImages = images;
        if (showLoading) {
          this.loading = false;
        }
        this.updateView();
      },
      error: (error: Error) => {
        this.productImages = [];
        if (showLoading) {
          this.loading = false;
        }
        this.showToast(error.message || 'No fue posible cargar imágenes del producto.', 'error');
        this.updateView();
      },
    });
  }

  private clearSelectedImages(): void {
    this.selectedImageFiles = [];
    this.selectedImagePreviews = [];
    this.imagePreview = '';
    this.updateView();
  }

  private uploadInventoryImageIfSelected(itemId: string, successMessage: string): void {
    if (!this.selectedInventoryItemImageFile) {
      this.closeInventoryItemModal();
      this.refreshInventoryAfterAction(successMessage, true);
      return;
    }

    this.api.uploadInventoryItemImage(itemId, this.selectedInventoryItemImageFile).subscribe({
      next: () => {
        this.closeInventoryItemModal();
        this.refreshInventoryAfterAction(`${successMessage} Imagen guardada.`, true);
      },
      error: (error: Error) => {
        this.closeInventoryItemModal();
        this.refreshInventoryAfterAction(`${successMessage} No fue posible guardar la imagen: ${error.message}`, true);
      },
    });
  }

  private clearInventoryItemImageSelection(): void {
    this.selectedInventoryItemImageFile = null;
    this.selectedInventoryItemImagePreview = '';
  }

  private updateView(): void {
    this.changeDetector.detectChanges();
  }

  private emptyProduct(): ProductPayload {
    return {
      name: '',
      slug: null,
      description: null,
      sku: null,
      price: 0,
      isActive: true,
      categoryId: null,
    };
  }

  private emptyInventoryItem(): InventoryItemPayload {
    return {
      productId: null,
      name: '',
      sku: '',
      type: 'Product',
      unit: 'unidad',
      initialStock: 0,
      minimumStock: 0,
      isActive: true,
    };
  }

  private emptyInventoryMovement(): InventoryMovementPayload {
    return {
      movementType: 'Entry',
      quantity: 1,
      unitCost: null,
      reason: '',
      reference: '',
    };
  }

  private emptyInvoiceUpload() {
    return {
      supplierName: '',
      supplierTaxId: '',
      invoiceNumber: '',
      invoiceDate: '',
      notes: '',
    };
  }

  private emptySupplier(): SupplierPayload {
    return {
      name: '',
      taxId: null,
      contactName: null,
      email: null,
      phone: null,
      address: null,
      city: null,
      country: 'Colombia',
      categoryId: null,
      status: 'Active',
      notes: null,
    };
  }

  private emptyInvoiceLine(): InvoiceImportLinePayload {
    return {
      inventoryItemId: null,
      rawText: '',
      extractedSku: '',
      extractedName: '',
      quantity: 1,
      unitCost: null,
      taxPercent: 19,
      taxAmount: null,
      lineTotal: null,
      notes: '',
      ignore: false,
    };
  }

  private emptyUser(): AdminUserPayload {
    return {
      email: '',
      fullName: '',
      password: '',
      isActive: true,
      roleIds: [],
    };
  }

  private emptyRole(): AdminRolePayload {
    return {
      name: '',
      description: '',
      permissionIds: [],
    };
  }

  private normalizeProduct(product: ProductPayload): ProductPayload {
    return {
      ...product,
      slug: product.slug || null,
      description: product.description || null,
      sku: product.sku || null,
      categoryId: product.categoryId || null,
      price: Number(product.price || 0),
    };
  }

  private normalizeSupplier(supplier: SupplierPayload): SupplierPayload {
    return {
      name: supplier.name.trim(),
      taxId: this.cleanOptional(supplier.taxId),
      contactName: this.cleanOptional(supplier.contactName),
      email: this.cleanOptional(supplier.email),
      phone: this.cleanOptional(supplier.phone),
      address: this.cleanOptional(supplier.address),
      city: this.cleanOptional(supplier.city),
      country: this.cleanOptional(supplier.country),
      categoryId: supplier.categoryId || null,
      status: supplier.status || 'Active',
      notes: this.cleanOptional(supplier.notes),
    };
  }

  private cleanOptional(value: string | null): string | null {
    return value && value.trim() ? value.trim() : null;
  }

  private normalizeInventoryItem(item: InventoryItemPayload): InventoryItemPayload {
    return {
      ...item,
      productId: item.productId || null,
      name: item.name.trim(),
      sku: item.sku.trim(),
      type: item.type || 'Product',
      unit: item.unit.trim() || 'unidad',
      initialStock: Number(item.initialStock || 0),
      minimumStock: Number(item.minimumStock || 0),
    };
  }

  private toInventoryUpdatePayload(item: InventoryItemPayload): InventoryItemUpdatePayload {
    return {
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      type: item.type,
      unit: item.unit,
      minimumStock: item.minimumStock,
      isActive: item.isActive,
    };
  }

  private normalizeInventoryMovement(movement: InventoryMovementPayload): InventoryMovementPayload {
    return {
      ...movement,
      quantity: Number(movement.quantity || 0),
      unitCost: movement.unitCost === null ? null : Number(movement.unitCost || 0),
      reason: movement.reason || null,
      reference: movement.reference || null,
    };
  }

  private normalizeInvoiceLine(line: InvoiceImportLinePayload): InvoiceImportLinePayload {
    return {
      inventoryItemId: line.inventoryItemId || null,
      rawText: line.rawText || null,
      extractedSku: line.extractedSku || null,
      extractedName: line.extractedName.trim(),
      quantity: Number(line.quantity || 0),
      unitCost: line.unitCost === null ? null : Number(line.unitCost || 0),
      taxPercent: line.taxPercent === null ? null : Number(line.taxPercent || 0),
      taxAmount: line.taxAmount === null ? null : Number(line.taxAmount || 0),
      lineTotal: line.lineTotal === null ? null : Number(line.lineTotal || 0),
      notes: line.notes || null,
      ignore: line.ignore,
    };
  }
}
