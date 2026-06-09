import { Component } from '@angular/core';
import { CatalogGallery } from '../../components/catalog-gallery/catalog-gallery';

@Component({
  selector: 'app-catalogo',
  imports: [CatalogGallery],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo {}
