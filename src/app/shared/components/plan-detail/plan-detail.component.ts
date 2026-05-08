import { Component, computed, input, output } from '@angular/core';
import { Plan } from '../../../core/models/plan.model';
import { ResultTabsComponent } from '../result-tabs/result-tabs.component';

@Component({
  selector: 'app-plan-detail',
  standalone: true,
  imports: [ResultTabsComponent],
  templateUrl: './plan-detail.component.html',
  styleUrl: './plan-detail.component.css',
})
export class PlanDetailComponent {
  plan  = input<Plan | null>(null);
  close = output<void>();

  hasTabs = computed(() => !!this.plan()?.resultTabs?.length);
}
