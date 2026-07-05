import { Component, computed, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faCalendarDays, faChartSimple, faDownload, faRobot, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Plan } from '../../../core/models/plan.model';
import { IconComponent } from '../icon/icon.component';
import { ResultTabsComponent } from '../result-tabs/result-tabs.component';

@Component({
  selector: 'app-plan-detail',
  standalone: true,
  imports: [ResultTabsComponent, IconComponent, FaIconComponent],
  templateUrl: './plan-detail.component.html',
  styleUrl: './plan-detail.component.css',
})
export class PlanDetailComponent {
  readonly faArrowLeft = faArrowLeft;
  readonly faCalendarDays = faCalendarDays;
  readonly faChartSimple = faChartSimple;
  readonly faDownload = faDownload;
  readonly faRobot = faRobot;
  readonly faXmark = faXmark;

  plan  = input<Plan | null>(null);
  close = output<void>();

  hasTabs = computed(() => !!this.plan()?.resultTabs?.length);
}
