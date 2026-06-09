import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Header } from "./components/header/header";
import { Footer } from "./components/footer/footer";
import { FloatingWhatsapp } from "./components/floating-whatsapp/floating-whatsapp";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, FloatingWhatsapp],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('landing-amas');
  protected readonly isAdminRoute = signal(false);

  constructor(private readonly router: Router) {
    this.setAdminRoute(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.setAdminRoute(event.urlAfterRedirects));
  }

  private setAdminRoute(url: string): void {
    this.isAdminRoute.set(url.startsWith('/admin'));
  }
}
