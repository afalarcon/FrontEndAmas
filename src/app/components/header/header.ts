import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { whatsappUrl } from '../../core/contact.config';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  readonly whatsappUrl = whatsappUrl();
}
