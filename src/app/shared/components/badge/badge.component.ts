import { Component, computed, input } from '@angular/core';

export type BadgeVariant = 'blue' | 'green' | 'gold' | 'purple' | 'gray' | 'red';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  blue:   'bg-accent-soft text-accent',
  green:  'bg-success-soft text-success',
  gold:   'bg-gold-soft text-gold',
  purple: 'bg-purple-soft text-purple',
  gray:   'bg-surface2 text-ink-soft',
  red:    'bg-danger-soft text-danger',
};

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `<span class="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold" [class]="variantClass()"><ng-content /></span>`,
})
export class BadgeComponent {
  variant = input<BadgeVariant>('gray');
  protected variantClass = computed(() => VARIANT_CLASSES[this.variant()]);
}
