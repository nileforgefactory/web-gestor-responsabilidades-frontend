import { Component, ChangeDetectionStrategy, effect, inject, input, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBolt, faStop, faCircleCheck, faXmark, faChevronDown, faFileLines, faBars,
} from '@fortawesome/free-solid-svg-icons';
import { BackgroundScraperService } from '../../../core/services/background-scraper.service';
import { PlanContextService } from '../../../core/services/plan-context.service';
import { LayoutService } from '../../../core/services/layout.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FaIconComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
})
export class TopbarComponent {
  readonly faBolt = faBolt;
  readonly faStop = faStop;
  readonly faCircleCheck = faCircleCheck;
  readonly faXmark = faXmark;
  readonly faChevronDown = faChevronDown;
  readonly faFileLines = faFileLines;
  readonly faBars = faBars;

  /** Título de la página actual (breadcrumb simple) */
  title = input<string>('');
  /** Eyebrow contextual encima del título (p.ej. sección) */
  eyebrow = input<string>('');

  readonly scraper = inject(BackgroundScraperService);
  readonly planContext = inject(PlanContextService);
  readonly layout = inject(LayoutService);

  readonly scraperMenuOpen = signal(false);
  readonly showCompletedAlert = signal(false);
  private prevEstado = '';

  constructor() {
    effect(() => {
      const estado = this.scraper.estado().estado;
      if (this.prevEstado === 'running' && estado === 'completed') {
        this.showCompletedAlert.set(true);
        setTimeout(() => this.showCompletedAlert.set(false), 6000);
      }
      this.prevEstado = estado;
    });
  }

  toggleScraper(): void {
    if (this.scraper.isRunning()) {
      this.scraper.cancelar();
    } else {
      this.scraper.iniciar();
    }
  }

  toggleScraperMenu(): void {
    this.scraperMenuOpen.update(v => !v);
  }

  closeMenus(): void {
    this.scraperMenuOpen.set(false);
  }

  dismissAlert(): void {
    this.showCompletedAlert.set(false);
  }
}
