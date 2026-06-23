import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ContactService } from '../../core/contact.service';
import { ContactRequestPayload } from '../../core/api.types';

declare global {
  interface Window {
    __AMAS_TURNSTILE_SITE_KEY__?: string;
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback': () => void;
          'error-callback': () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

type ContactStatus = 'idle' | 'sending' | 'success' | 'error';

@Component({
  selector: 'app-footer',
  imports: [FormsModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer implements AfterViewInit {
  @ViewChild('turnstileContainer') private readonly turnstileContainer?: ElementRef<HTMLElement>;

  readonly requestTypes = [
    'Producto personalizado',
    'Cotización',
    'Impresión 3D',
    'Papelería creativa',
    'Sublimación',
    'Otro',
  ];

  readonly turnstileSiteKey = typeof window === 'undefined' ? '' : window.__AMAS_TURNSTILE_SITE_KEY__?.trim() ?? '';
  readonly hasCaptcha = Boolean(this.turnstileSiteKey);
  readonly minMessageLength = 15;

  contactForm = this.emptyContactForm();
  contactStatus: ContactStatus = 'idle';
  contactMessage = '';
  captchaToken = '';
  private formStartedAt = Date.now();
  private turnstileWidgetId = '';
  private readonly minSubmitDelayMs = 2500;
  private readonly cooldownMs = 60_000;
  private readonly cooldownStorageKey = 'amas_contact_last_submit_at';

  constructor(private readonly contactService: ContactService) {}

  ngAfterViewInit(): void {
    this.loadTurnstile();
  }

  submitContact(form: NgForm): void {
    this.contactMessage = '';

    if (this.contactForm.website) {
      this.completeAsReceived(form);
      return;
    }

    if (Date.now() - this.formStartedAt < this.minSubmitDelayMs) {
      this.showContactError('No fue posible enviar la solicitud. Intenta nuevamente.');
      return;
    }

    if (this.isCoolingDown()) {
      this.showContactError('Espera un momento antes de enviar otra solicitud.');
      return;
    }

    if (form.invalid || this.contactForm.message.trim().length < this.minMessageLength) {
      form.control.markAllAsTouched();
      this.showContactError('Revisa los campos requeridos antes de enviar.');
      return;
    }

    if (this.hasCaptcha && !this.captchaToken) {
      this.showContactError('No fue posible validar el formulario. Intenta nuevamente.');
      return;
    }

    this.contactStatus = 'sending';
    const payload = this.toPayload();

    this.contactService.createContactRequest(payload).subscribe({
      next: () => {
        this.storeCooldown();
        this.completeAsReceived(form);
      },
      error: (error: Error) => {
        this.showContactError(error.message || 'No fue posible enviar la solicitud.');
        this.resetTurnstile();
      },
    });
  }

  private toPayload(): ContactRequestPayload {
    return {
      fullName: this.contactForm.fullName.trim(),
      email: this.contactForm.email.trim().toLowerCase(),
      phone: this.cleanOptional(this.contactForm.phone),
      requestType: this.contactForm.requestType,
      message: this.contactForm.message.trim(),
      sourcePage: typeof window === 'undefined' ? 'landing' : window.location.pathname,
      captchaToken: this.captchaToken || null,
      website: this.cleanOptional(this.contactForm.website),
    };
  }

  private loadTurnstile(): void {
    if (!this.hasCaptcha || typeof document === 'undefined') {
      return;
    }

    if (window.turnstile) {
      this.renderTurnstile();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-amas-turnstile]');
    if (existingScript) {
      existingScript.addEventListener('load', () => this.renderTurnstile(), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset['amasTurnstile'] = 'true';
    script.addEventListener('load', () => this.renderTurnstile(), { once: true });
    document.head.appendChild(script);
  }

  private renderTurnstile(): void {
    if (!this.hasCaptcha || !this.turnstileContainer?.nativeElement || !window.turnstile || this.turnstileWidgetId) {
      return;
    }

    this.turnstileWidgetId = window.turnstile.render(this.turnstileContainer.nativeElement, {
      sitekey: this.turnstileSiteKey,
      callback: (token) => {
        this.captchaToken = token;
      },
      'expired-callback': () => {
        this.captchaToken = '';
      },
      'error-callback': () => {
        this.captchaToken = '';
      },
    });
  }

  private resetTurnstile(): void {
    this.captchaToken = '';
    if (this.hasCaptcha && window.turnstile) {
      window.turnstile.reset(this.turnstileWidgetId || undefined);
    }
  }

  private completeAsReceived(form: NgForm): void {
    this.contactStatus = 'success';
    this.contactMessage = 'Solicitud recibida. Te contactaremos pronto.';
    this.contactForm = this.emptyContactForm();
    this.formStartedAt = Date.now();
    form.resetForm(this.contactForm);
    this.resetTurnstile();
  }

  private showContactError(message: string): void {
    this.contactStatus = 'error';
    this.contactMessage = message;
  }

  private isCoolingDown(): boolean {
    const lastSubmitAt = Number(localStorage.getItem(this.cooldownStorageKey) || 0);
    return Number.isFinite(lastSubmitAt) && Date.now() - lastSubmitAt < this.cooldownMs;
  }

  private storeCooldown(): void {
    localStorage.setItem(this.cooldownStorageKey, String(Date.now()));
  }

  private cleanOptional(value: string): string | null {
    const cleaned = value.trim();
    return cleaned ? cleaned : null;
  }

  private emptyContactForm() {
    return {
      fullName: '',
      email: '',
      phone: '',
      requestType: this.requestTypes[0],
      message: '',
      acceptedContact: false,
      website: '',
    };
  }
}
