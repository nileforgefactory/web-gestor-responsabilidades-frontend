import { Component, input } from '@angular/core';

export type BadgeVariant = 'blue' | 'green' | 'gold' | 'purple' | 'gray' | 'red';

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `<span class="badge" [class]="'badge--' + variant()"><ng-content /></span>`,
  styles: [`
    :host { display: inline-flex; }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }
    .badge--blue   { background: var(--accent-soft);  color: var(--accent); }
    .badge--green  { background: var(--green-soft);   color: var(--green);  }
    .badge--gold   { background: var(--gold-soft);    color: var(--gold);   }
    .badge--purple { background: var(--purple-soft);  color: var(--purple); }
    .badge--gray   { background: var(--surface2);     color: var(--text2);  }
    .badge--red    { background: #FEF2F2;             color: var(--red);    }
  `],
})
export class BadgeComponent {
  variant = input<BadgeVariant>('gray');
}
