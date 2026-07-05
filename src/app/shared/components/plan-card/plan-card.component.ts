import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowRight, faCalendarDays, faTrash, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { Plan } from '../../../core/models/plan.model';
import { BadgeComponent } from '../badge/badge.component';
import { IconComponent } from '../icon/icon.component';
import { AuthService } from '../../../core/services/auth.service';
import { PlanContextService } from '../../../core/services/plan-context.service';

@Component({
  selector: 'app-plan-card',
  standalone: true,
  imports: [BadgeComponent, IconComponent, FaIconComponent],
  templateUrl: './plan-card.component.html',
  styleUrl: './plan-card.component.css',
})
export class PlanCardComponent {
  private auth = inject(AuthService);
  readonly planContext = inject(PlanContextService);

  readonly faArrowRight = faArrowRight;
  readonly faCalendarDays = faCalendarDays;
  readonly faTrash = faTrash;
  readonly faCheckCircle = faCheckCircle;

  plan       = input.required<Plan>();
  viewDetail = output<Plan>();
  deletePlan = output<Plan>();

  readonly puedeEliminar = this.auth.isAdmin;

  readonly esActivo = computed(() => this.planContext.planActivoId() === this.plan().id);

  marcarActivo(event: Event): void {
    event.stopPropagation();
    this.planContext.seleccionar(this.plan().id);
  }
}
