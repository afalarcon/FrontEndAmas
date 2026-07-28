import { Component } from '@angular/core';
import { whatsappUrl } from '../../core/contact.config';

@Component({
  selector: 'app-floating-whatsapp',
  imports: [],
  templateUrl: './floating-whatsapp.html',
  styleUrl: './floating-whatsapp.css',
})
export class FloatingWhatsapp {
  readonly whatsappUrl = whatsappUrl('Hola, quiero más información sobre sus productos');
}
