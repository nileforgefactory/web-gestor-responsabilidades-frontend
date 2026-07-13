import { Injectable, computed, signal } from '@angular/core';

/** Estado de UI del shell compartido entre topbar, riel y paneles secundarios. */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  /** Riel abierto como drawer en pantallas pequeñas. */
  readonly mobileNavOpen = signal(false);

  /** Riel colapsado a solo iconos (persistido). */
  readonly railCollapsed = signal(this.readCollapsed());

  /** Ancho actual del riel en px (para posicionar overlays a su derecha). */
  readonly railWidth = computed(() => (this.railCollapsed() ? 60 : 248));

  private readCollapsed(): boolean {
    try {
      return localStorage.getItem('rail:collapsed') === '1';
    } catch {
      return false;
    }
  }

  toggleRailCollapsed(): void {
    this.railCollapsed.update(v => {
      const next = !v;
      try {
        localStorage.setItem('rail:collapsed', next ? '1' : '0');
      } catch { /* SSR / modo privado */ }
      return next;
    });
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update(v => !v);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }
}
