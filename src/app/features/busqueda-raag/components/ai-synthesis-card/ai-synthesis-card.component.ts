import { Component, input, output } from '@angular/core';
import { RagSynthesis } from '../../../../core/models/rag.model';

@Component({
  selector: 'app-ai-synthesis-card',
  standalone: true,
  templateUrl: './ai-synthesis-card.component.html',
  styleUrl: './ai-synthesis-card.component.css',
})
export class AiSynthesisCardComponent {
  synthesis      = input<RagSynthesis | null>(null);
  loading        = input<boolean>(false);
  queryText      = input<string>('');
  showActions    = input<boolean>(true);

  addToPlan      = output<void>();
  exportAnalysis = output<void>();
  viewMatrix     = output<void>();
}
