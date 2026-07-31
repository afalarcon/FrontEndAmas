import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { CatalogService } from '../../core/catalog.service';
import { CatalogCategory, CatalogProduct, CatalogProductImage } from '../../core/api.types';
import { whatsappUrl } from '../../core/contact.config';

@Component({
  selector: 'app-catalog-gallery',
  imports: [CommonModule, FormsModule],
  templateUrl: './catalog-gallery.html',
  styleUrl: './catalog-gallery.css',
})
export class CatalogGallery implements OnInit, AfterViewChecked, OnDestroy {
  @Input() categorySlug: string | null = null;
  @Input() showFilter = false;
  @ViewChild('loadMoreTrigger') private loadMoreTrigger?: ElementRef<HTMLElement>;

  private readonly catalogService = inject(CatalogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly failedImageIds = new Set<string>();
  private readonly loadedImageIds = new Set<string>();
  private static readonly RotationIntervalMs = 1800;
  private static readonly InitialProductLimit = 8;
  private static readonly ProductBatchSize = 8;
  readonly activeImageIndexes = new Map<string, number>();
  visibleProductLimit = CatalogGallery.InitialProductLimit;
  private hoverTimerId: number | null = null;
  private loadMoreObserver: IntersectionObserver | null = null;
  private observedLoadMoreElement: HTMLElement | null = null;
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

  ngAfterViewChecked(): void {
    this.observeLoadMoreTrigger();
  }

  ngOnDestroy(): void {
    this.stopImageRotation();
    this.loadMoreObserver?.disconnect();
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

  get renderedProducts(): CatalogProduct[] {
    return this.visibleProducts.slice(0, this.visibleProductLimit);
  }

  get hasMoreProducts(): boolean {
    return this.visibleProductLimit < this.visibleProducts.length;
  }

  onCategoryChange(): void {
    this.resetGalleryState();
    this.loadProducts();
  }

  productImage(product: CatalogProduct): CatalogProductImage | null {
    const images = this.availableImages(product);
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
    return whatsappUrl(text);
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
    return this.sortedImages(product).length > 0 && this.availableImages(product).length === 0;
  }

  imageLoaded(product: CatalogProduct): boolean {
    const image = this.productImage(product);
    return image ? this.loadedImageIds.has(image.id) : false;
  }

  markImageAsLoaded(product: CatalogProduct): void {
    const image = this.productImage(product);
    if (image) {
      this.loadedImageIds.add(image.id);
    }
  }

  markImageAsFailed(product: CatalogProduct): void {
    const image = this.productImage(product);
    if (!image) {
      return;
    }

    this.failedImageIds.add(image.id);
    this.loadedImageIds.delete(image.id);

    if (this.availableImages(product).length > 0) {
      this.activeImageIndexes.set(product.id, 0);
    }

    this.changeDetector.detectChanges();
  }

  imageLoadingMode(index: number): 'eager' | 'lazy' {
    return index < 4 ? 'eager' : 'lazy';
  }

  imageFetchPriority(index: number): 'high' | 'auto' {
    return index < 4 ? 'high' : 'auto';
  }

  loadMoreProducts(): void {
    if (!this.hasMoreProducts) {
      return;
    }

    this.visibleProductLimit = Math.min(
      this.visibleProductLimit + CatalogGallery.ProductBatchSize,
      this.visibleProducts.length,
    );

    if (!this.hasMoreProducts) {
      this.loadMoreObserver?.disconnect();
      this.loadMoreObserver = null;
      this.observedLoadMoreElement = null;
    }

    this.changeDetector.detectChanges();
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
          this.resetVisibleProducts();

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
          this.resetVisibleProducts();
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

  private availableImages(product: CatalogProduct): CatalogProductImage[] {
    return this.sortedImages(product).filter((image) => !this.failedImageIds.has(image.id));
  }

  private resetGalleryState(): void {
    this.failedImageIds.clear();
    this.loadedImageIds.clear();
    this.activeImageIndexes.clear();
    this.resetVisibleProducts();
  }

  private resetVisibleProducts(): void {
    this.visibleProductLimit = CatalogGallery.InitialProductLimit;
    this.loadMoreObserver?.disconnect();
    this.loadMoreObserver = null;
    this.observedLoadMoreElement = null;
  }

  private observeLoadMoreTrigger(): void {
    const element = this.loadMoreTrigger?.nativeElement;
    if (
      !element ||
      !this.hasMoreProducts ||
      this.observedLoadMoreElement === element ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return;
    }

    this.loadMoreObserver?.disconnect();
    this.observedLoadMoreElement = element;
    this.loadMoreObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.loadMoreProducts();
        }
      },
      { rootMargin: '420px 0px' },
    );
    this.loadMoreObserver.observe(element);
  }
}
