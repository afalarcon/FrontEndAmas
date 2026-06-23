import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, HostListener, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { CatalogService } from '../../core/catalog.service';
import { CatalogCategory, CatalogProduct, CatalogProductImage } from '../../core/api.types';

@Component({
  selector: 'app-catalog-gallery',
  imports: [CommonModule, FormsModule],
  templateUrl: './catalog-gallery.html',
  styleUrl: './catalog-gallery.css',
})
export class CatalogGallery implements OnInit {
  @Input() categorySlug: string | null = null;
  @Input() showFilter = false;

  private readonly catalogService = inject(CatalogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly failedProductIds = new Set<string>();
  private static readonly RotationIntervalMs = 1800;
  readonly activeImageIndexes = new Map<string, number>();
  private hoverTimerId: number | null = null;
  private touchStartX = 0;

  categories: CatalogCategory[] = [];
  products: CatalogProduct[] = [];
  selectedSlug = 'all';
  isLoading = true;
  errorMessage = '';
  selectedProduct: CatalogProduct | null = null;

  ngOnInit(): void {
    this.selectedSlug = this.categorySlug ?? 'all';
    this.loadCatalog();
  }

  get currentCategoryName(): string {
    if (this.selectedSlug === 'all') {
      return 'Todos los productos';
    }

    return this.categories.find((category) => category.slug === this.selectedSlug)?.name ?? 'Categoria';
  }

  get selectedCategoryId(): string | null {
    if (this.selectedSlug === 'all') {
      return null;
    }

    return this.categories.find((category) => category.slug === this.selectedSlug)?.id ?? null;
  }

  get visibleProducts(): CatalogProduct[] {
    const productsWithImages = this.products.filter((product) => product.images.length > 0);

    if (this.selectedSlug === 'all') {
      return productsWithImages;
    }

    return productsWithImages.filter((product) =>
      product.categoryId === this.selectedCategoryId ||
      product.categories.some((category) => category.categorySlug === this.selectedSlug),
    );
  }

  onCategoryChange(): void {
    this.failedProductIds.clear();
    this.activeImageIndexes.clear();
    this.loadProducts();
  }

  productImage(product: CatalogProduct): CatalogProductImage | null {
    const images = this.sortedImages(product);
    if (images.length === 0) {
      return null;
    }

    const index = this.activeImageIndexes.get(product.id) ?? 0;
    return images[Math.min(index, images.length - 1)];
  }

  productImageUrl(product: CatalogProduct): string {
    const image = this.productImage(product);
    return image ? this.catalogService.imageUrl(image) : '';
  }

  activeImageText(product: CatalogProduct): string {
    return this.productImage(product)?.altText?.trim() || product.name;
  }

  activeImageDescription(product: CatalogProduct): string {
    return this.productImage(product)?.altText?.trim() || product.description?.trim() || '';
  }

  productTitle(product: CatalogProduct): string {
    return product.name;
  }

  productCategoryName(product: CatalogProduct): string {
    return product.categories[0]?.categoryName || product.categoryName || 'Catalogo';
  }

  whatsappUrl(product: CatalogProduct): string {
    const text = `Hola, quiero informacion sobre este producto: ${product.name}`;
    return `https://wa.me/573216499629?text=${encodeURIComponent(text)}`;
  }

  openProduct(product: CatalogProduct): void {
    if (this.imageFailed(product)) {
      return;
    }

    this.selectedProduct = product;
    this.activeImageIndexes.set(product.id, this.activeImageIndexes.get(product.id) ?? 0);
  }

  closeProduct(): void {
    this.selectedProduct = null;
  }

  startImageRotation(product: CatalogProduct): void {
    const images = this.sortedImages(product);
    if (images.length <= 1) {
      return;
    }

    this.stopImageRotation();
    this.hoverTimerId = window.setInterval(() => this.nextImage(product), CatalogGallery.RotationIntervalMs);
  }

  stopImageRotation(product?: CatalogProduct): void {
    if (this.hoverTimerId !== null) {
      window.clearInterval(this.hoverTimerId);
      this.hoverTimerId = null;
    }

    if (product) {
      this.activeImageIndexes.set(product.id, 0);
    }
  }

  nextImage(product: CatalogProduct): void {
    const images = this.sortedImages(product);
    if (images.length <= 1) {
      return;
    }

    const current = this.activeImageIndexes.get(product.id) ?? 0;
    this.activeImageIndexes.set(product.id, (current + 1) % images.length);
    this.changeDetector.detectChanges();
  }

  previousImage(product: CatalogProduct): void {
    const images = this.sortedImages(product);
    if (images.length <= 1) {
      return;
    }

    const current = this.activeImageIndexes.get(product.id) ?? 0;
    this.activeImageIndexes.set(product.id, (current - 1 + images.length) % images.length);
    this.changeDetector.detectChanges();
  }

  setActiveImage(product: CatalogProduct, index: number): void {
    const images = this.sortedImages(product);
    if (index < 0 || index >= images.length) {
      return;
    }

    this.activeImageIndexes.set(product.id, index);
    this.changeDetector.detectChanges();
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0]?.clientX ?? 0;
  }

  onTouchEnd(event: TouchEvent, product: CatalogProduct): void {
    const endX = event.changedTouches[0]?.clientX ?? 0;
    if (Math.abs(this.touchStartX - endX) > 36) {
      this.nextImage(product);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeProduct();
  }

  @HostListener('document:keydown.arrowleft')
  onArrowLeft(): void {
    if (this.selectedProduct) {
      this.previousImage(this.selectedProduct);
    }
  }

  @HostListener('document:keydown.arrowright')
  onArrowRight(): void {
    if (this.selectedProduct) {
      this.nextImage(this.selectedProduct);
    }
  }

  imageFailed(product: CatalogProduct): boolean {
    return this.failedProductIds.has(product.id);
  }

  markImageAsFailed(product: CatalogProduct): void {
    this.failedProductIds.add(product.id);
  }

  private loadCatalog(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      categories: this.catalogService.catalogs(),
      products: this.catalogService.catalogProducts(null),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ categories, products }) => {
          this.categories = categories;
          this.products = products;

          if (this.categorySlug && !categories.some((category) => category.slug === this.categorySlug)) {
            this.errorMessage = 'Esta categoria aun no tiene productos publicados.';
          }

          this.isLoading = false;
          this.changeDetector.detectChanges();
        },
        error: (error) => {
          this.errorMessage = error?.message ?? 'No fue posible cargar el catalogo.';
          this.isLoading = false;
          this.changeDetector.detectChanges();
        },
      });
  }

  private loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.catalogService
      .catalogProducts(this.selectedCategoryId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.products = products;
          this.isLoading = false;
          this.changeDetector.detectChanges();
        },
        error: (error) => {
          this.errorMessage = error?.message ?? 'No fue posible cargar productos.';
          this.isLoading = false;
          this.changeDetector.detectChanges();
        },
      });
  }

  private sortedImages(product: CatalogProduct): CatalogProductImage[] {
    return [...product.images].sort((first, second) => {
      if (first.isPrimary !== second.isPrimary) {
        return first.isPrimary ? -1 : 1;
      }

      return first.sortOrder - second.sortOrder;
    });
  }
}
