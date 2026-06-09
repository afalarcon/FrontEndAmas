import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
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
  Permission,
  Product,
  ProductPayload,
} from '../core/api.types';

type AdminTab = 'overview' | 'products' | 'categories' | 'content' | 'images' | 'users';
type ToastType = 'success' | 'error' | 'info';

interface AdminToast {
  type: ToastType;
  message: string;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  activeTab: AdminTab = 'overview';
  sidebarCollapsed = false;
  userMenuOpen = false;
  products: Product[] = [];
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
  private toastTimeoutId: number | null = null;
  editingProductId: string | null = null;
  editingCategoryId: string | null = null;
  isProductModalOpen = false;
  isCategoryModalOpen = false;
  isConfigurationModalOpen = false;
  isUserModalOpen = false;
  isRoleModalOpen = false;
  editingUserId: string | null = null;
  editingRoleId: string | null = null;
  imagePreview = '';
  selectedImageCategoryId = '';
  selectedImageFiles: File[] = [];
  selectedImagePreviews: string[] = [];
  imageAltText = '';
  categoryImages: CategoryImage[] = [];
  imageUploadMessage = '';

  productForm: ProductPayload = this.emptyProduct();
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
    this.refresh();
  }

  get activeProducts(): number {
    return this.products.filter((product) => product.isActive).length;
  }

  get inventoryValue(): number {
    return this.products.reduce((total, product) => total + Number(product.price || 0), 0);
  }

  get userEmail(): string {
    return this.auth.userEmail();
  }

  refresh(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      products: this.api.products(),
      categories: this.api.categories(),
      configurations: this.api.configurations(),
      users: this.api.users(),
      roles: this.api.roles(),
      permissions: this.api.permissions(),
    }).subscribe({
      next: ({ products, categories, configurations, users, roles, permissions }) => {
        this.products = products;
        this.categories = categories;
        this.configurations = configurations;
        this.users = users;
        this.roles = roles;
        this.permissions = permissions;
        this.ensureSelectedImageCategory();
        this.loading = false;
      },
      error: (error: Error) => {
        this.loading = false;
        this.error = error.message || 'No fue posible cargar la información del administrador.';
        this.showToast(this.error, 'error');
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
      },
      error: (error: Error) => {
        this.loading = false;
        this.error = error.message || 'No fue posible cargar categorías.';
        this.showToast(this.error, 'error');
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
      },
      error: (error: Error) => {
        this.loading = false;
        this.error = error.message || 'No fue posible cargar configuraciones.';
        this.showToast(this.error, 'error');
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

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  onImageCategoryChange(): void {
    this.clearSelectedImages();
    this.loadCategoryImages();
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

    if (this.selectedImageFiles.length === 0) {
      this.imageUploadMessage = 'Selecciona al menos una imagen para cargar.';
      this.showToast('Selecciona al menos una imagen para cargar.', 'error');
      return;
    }

    this.imageUploadMessage = 'Cargando imágenes...';
    this.startAction('uploadCategoryImages');
    this.updateView();
    this.api
      .uploadCategoryImages(
        this.selectedImageCategoryId,
        this.selectedImageFiles,
        this.imageAltText || null,
      )
      .subscribe({
        next: (uploadedImages) => {
          this.clearSelectedImages();
          this.categoryImages = [...this.categoryImages, ...uploadedImages].sort(
            (a, b) => a.sortOrder - b.sortOrder,
          );
          this.imageUploadMessage =
            uploadedImages.length === 1
              ? 'Imagen cargada correctamente.'
              : `${uploadedImages.length} imágenes cargadas correctamente.`;
          this.finishActionWithSuccess(
            this.imageUploadMessage,
          );
          this.loadCategoryImages(false);
          this.updateView();
        },
        error: (error: Error) => {
          this.imageUploadMessage = error.message || 'No fue posible cargar las imágenes.';
          this.finishActionWithError(this.imageUploadMessage);
          this.updateView();
        },
      });
  }

  imageUrl(image: CategoryImage): string {
    return image.url.startsWith('http') ? image.url : `${API_ORIGIN_URL}${image.url}`;
  }

  logout(): void {
    this.auth.logout();
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
      this.categoryImages = [];
      return;
    }

    const selectedExists = this.categories.some((category) => category.id === this.selectedImageCategoryId);
    if (!selectedExists) {
      this.selectedImageCategoryId = this.categories[0].id;
    }

    this.loadCategoryImages(false);
  }

  private loadCategoryImages(showLoading = true): void {
    if (!this.selectedImageCategoryId) {
      this.categoryImages = [];
      return;
    }

    if (showLoading) {
      this.loading = true;
    }

    this.api.categoryImages(this.selectedImageCategoryId).subscribe({
      next: (images) => {
        this.categoryImages = images;
        if (showLoading) {
          this.loading = false;
        }
      },
      error: (error: Error) => {
        this.categoryImages = [];
        if (showLoading) {
          this.loading = false;
        }
        this.showToast(error.message || 'No fue posible cargar las imágenes de la categoría.', 'error');
      },
    });
  }

  private refreshCategoryImagesAfterAction(message: string): void {
    if (!this.selectedImageCategoryId) {
      this.finishActionWithSuccess(message);
      return;
    }

    this.api.categoryImages(this.selectedImageCategoryId).subscribe({
      next: (images) => {
        this.categoryImages = images;
        this.finishActionWithSuccess(message);
      },
      error: (error: Error) => {
        this.finishActionWithError(error.message || 'La carga terminó, pero no fue posible refrescar imágenes.');
      },
    });
  }

  private clearSelectedImages(): void {
    this.selectedImageFiles = [];
    this.selectedImagePreviews = [];
    this.imagePreview = '';
    this.updateView();
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
}
