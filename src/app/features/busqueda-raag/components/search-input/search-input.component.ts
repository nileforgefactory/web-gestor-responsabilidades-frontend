import { Component, effect, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-search-input',
  standalone: true,
  templateUrl: './search-input.component.html',
  styleUrl: './search-input.component.css',
})
export class SearchInputComponent {
  initialValue = input<string>('');
  disabled     = input<boolean>(false);
  suggestions  = input<string[]>([]);

  search = output<string>();

  queryValue = signal('');

  constructor() {
    effect(() => {
      const v = this.initialValue();
      if (v) this.queryValue.set(v);
    });
  }

  onInput(event: Event): void {
    this.queryValue.set((event.target as HTMLInputElement).value);
  }

  onSearch(): void {
    const q = this.queryValue().trim();
    if (q && !this.disabled()) this.search.emit(q);
  }

  onSuggestionClick(s: string): void {
    if (this.disabled()) return;
    this.queryValue.set(s);
    this.search.emit(s);
  }

  onClear(): void {
    this.queryValue.set('');
  }
}
