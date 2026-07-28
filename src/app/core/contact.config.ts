declare global {
  interface Window {
    __AMAS_WHATSAPP_NUMBER__?: string;
  }
}

const defaultWhatsappNumber = '573216499629';

const runtimeWhatsappNumber =
  typeof window === 'undefined' ? '' : window.__AMAS_WHATSAPP_NUMBER__?.trim() ?? '';

export const WHATSAPP_NUMBER = (runtimeWhatsappNumber || defaultWhatsappNumber).replace(/\D/g, '');

export function whatsappUrl(message?: string): string {
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${WHATSAPP_NUMBER}${query}`;
}
