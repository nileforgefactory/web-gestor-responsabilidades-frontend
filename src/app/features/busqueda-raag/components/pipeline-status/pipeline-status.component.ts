import { Component, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faCircleXmark, faGear } from '@fortawesome/free-solid-svg-icons';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { PipelineStep } from '../../../../core/models/rag.model';

@Component({
  selector: 'app-pipeline-status',
  standalone: true,
  imports: [FaIconComponent, IconComponent],
  templateUrl: './pipeline-status.component.html',
  styleUrl: './pipeline-status.component.css',
})
export class PipelineStatusComponent {
  readonly faCircleCheck = faCircleCheck;
  readonly faCircleXmark = faCircleXmark;
  readonly faGear = faGear;

  steps = input<PipelineStep[]>([]);
}
