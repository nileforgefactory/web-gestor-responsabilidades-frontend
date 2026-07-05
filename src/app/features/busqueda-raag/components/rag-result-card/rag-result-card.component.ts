import { Component, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faClipboardList } from '@fortawesome/free-solid-svg-icons';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { RagResult } from '../../../../core/models/rag.model';

@Component({
  selector: 'app-rag-result-card',
  standalone: true,
  imports: [BadgeComponent, FaIconComponent],
  templateUrl: './rag-result-card.component.html',
  styleUrl: './rag-result-card.component.css',
})
export class RagResultCardComponent {
  readonly faClipboardList = faClipboardList;

  result     = input.required<RagResult>();
  addToPlan  = output<RagResult>();
  viewDetail = output<RagResult>();

  get relevanceColor(): string {
    const r = this.result().relevance;
    if (r >= 90) return 'var(--color-success)';
    if (r >= 75) return 'var(--color-gold)';
    return 'var(--text2)';
  }
}
