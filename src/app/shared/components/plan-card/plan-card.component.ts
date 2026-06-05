import { Component, input, output } from '@angular/core';
import { Plan } from '../../../core/models/plan.model';
import { BadgeComponent } from '../badge/badge.component';

@Component({
  selector: 'app-plan-card',
  standalone: true,
  imports: [BadgeComponent],
  templateUrl: './plan-card.component.html',
  styleUrl: './plan-card.component.css',
})
export class PlanCardComponent {
  plan       = input.required<Plan>();
  viewDetail = output<Plan>();
  deletePlan = output<Plan>();
}
