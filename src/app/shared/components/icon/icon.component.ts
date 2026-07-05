import { Component, computed, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { emojiToIcon } from './icon-map';

/** Renderiza como FontAwesome un emoji legado usado como dato (`item.icon`, etc). */
@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [FaIconComponent],
  template: `<fa-icon [icon]="icon()" />`,
})
export class IconComponent {
  emoji = input<string | undefined | null>(null);
  icon = computed(() => emojiToIcon(this.emoji()));
}
