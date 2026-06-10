import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, HostListener, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogService } from '../../core/catalog.service';
import { CatalogCategory, CategoryImage } from '../../core/api.types';

interface GalleryImage {
  image: CategoryImage;
  categoryName: string;
  categorySlug: string;
  sourceUrl: string;
}

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

  categories: CatalogCategory[] = [];
  selectedSlug = 'all';
  isLoading = true;
  errorMessage = '';
  selectedImage: GalleryImage | null = null;

  ngOnInit(): void {
    this.selectedSlug = this.categorySlug ?? 'all';
    this.loadCatalogs();
  }

  get visibleImages(): GalleryImage[] {
    const selectedCategories =
      this.selectedSlug === 'all'
        ? this.categories
        : this.categories.filter((category) => category.slug === this.selectedSlug);

    return selectedCategories.flatMap((category) =>
      [...category.images]
        .sort((first, second) => first.sortOrder - second.sortOrder)
        .map((image) => ({
          image,
          categoryName: category.name,
          categorySlug: category.slug,
          sourceUrl: this.catalogService.imageUrl(image),
        })),
    );
  }

  get currentCategoryName(): string {
    if (this.selectedSlug === 'all') {
      return 'Todas las categorias';
    }

    return this.categories.find((category) => category.slug === this.selectedSlug)?.name ?? 'Categoria';
  }

  imageTitle(item: GalleryImage): string {
    return item.image.altText || item.image.fileName || item.categoryName;
  }

  whatsappUrl(item: GalleryImage): string {
    const text = `Hola, quiero informacion sobre este diseño de ${item.categoryName}: ${this.imageTitle(item)} ${item.sourceUrl}`;
    return `https://wa.me/573216499629?text=${encodeURIComponent(text)}`;
  }

  openImage(item: GalleryImage): void {
    this.selectedImage = item;
  }

  closeImage(): void {
    this.selectedImage = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeImage();
  }

  private loadCatalogs(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.catalogService
      .catalogs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          this.categories = categories;

          if (this.categorySlug && !categories.some((category) => category.slug === this.categorySlug)) {
            this.errorMessage = 'Esta categoria aun no tiene contenido publicado.';
          }

          this.isLoading = false;
          this.changeDetector.detectChanges();
        },
        error: (error) => {
          this.errorMessage = error?.message ?? 'No fue posible cargar las imagenes del catalogo.';
          this.isLoading = false;
          this.changeDetector.detectChanges();
        },
      });
  }
}
