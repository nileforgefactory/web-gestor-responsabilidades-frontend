import { Component, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faRobot, faDownload, faTableCells } from '@fortawesome/free-solid-svg-icons';
import { RagSynthesis } from '../../../../core/models/rag.model';

@Component({
  selector: 'app-ai-synthesis-card',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './ai-synthesis-card.component.html',
  styleUrl: './ai-synthesis-card.component.css',
})
export class AiSynthesisCardComponent {
  readonly faRobot = faRobot;
  readonly faDownload = faDownload;
  readonly faTableCells = faTableCells;

  synthesis      = input<RagSynthesis | null>(null);
  loading        = input<boolean>(false);
  queryText      = input<string>('');
  showActions    = input<boolean>(true);

  addToPlan      = output<void>();
  exportAnalysis = output<void>();
  viewMatrix     = output<void>();
}
