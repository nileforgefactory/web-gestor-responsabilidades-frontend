import { Component, input } from '@angular/core';
import { PipelineStep } from '../../../../core/models/rag.model';

@Component({
  selector: 'app-pipeline-status',
  standalone: true,
  templateUrl: './pipeline-status.component.html',
  styleUrl: './pipeline-status.component.css',
})
export class PipelineStatusComponent {
  steps = input<PipelineStep[]>([]);
}
