import { Component, input, output } from '@angular/core';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { RagResult } from '../../../../core/models/rag.model';

@Component({
  selector: 'app-rag-result-card',
  standalone: true,
  imports: [BadgeComponent],
  templateUrl: './rag-result-card.component.html',
  styleUrl: './rag-result-card.component.css',
})
export class RagResultCardComponent {
  result     = input.required<RagResult>();
  addToPlan  = output<RagResult>();
  viewDetail = output<RagResult>();

  get relevanceColor(): string {
    const r = this.result().relevance;
    if (r >= 90) return 'var(--green)';
    if (r >= 75) return 'var(--gold)';
    return 'var(--text2)';
  }
}
