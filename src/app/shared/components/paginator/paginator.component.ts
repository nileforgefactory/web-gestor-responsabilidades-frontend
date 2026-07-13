import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons';

/** Paginador cliente reutilizable. El padre mantiene `page` y corta la lista. */
@Component({
  selector: 'app-paginator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FaIconComponent],
  template: `
    @if (totalPages() > 1) {
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
        <span class="text-[11px] text-ink-faint tabular">{{ start() }}–{{ end() }} de {{ total() }}</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-lg border border-border text-ink-soft transition-colors enabled:hover:border-accent/40 enabled:hover:bg-accent-soft enabled:hover:text-accent disabled:opacity-40"
            [disabled]="page() <= 1"
            (click)="go(page() - 1)"
            aria-label="Página anterior"
          ><fa-icon [icon]="faAngleLeft" class="text-xs" /></button>

          @for (p of pageList(); track $index) {
            @if (p === -1) {
              <span class="px-1 text-xs text-ink-faint">…</span>
            } @else {
              <button
                type="button"
                class="grid h-8 min-w-8 place-items-center rounded-lg border px-2 text-[13px] font-semibold tabular transition-colors"
                [class.border-accent]="p === page()"
                [class.bg-accent]="p === page()"
                [class.text-white]="p === page()"
                [class.border-border]="p !== page()"
                [class.text-ink-soft]="p !== page()"
                [class.hover:bg-surface3]="p !== page()"
                (click)="go(p)"
              >{{ p }}</button>
            }
          }

          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-lg border border-border text-ink-soft transition-colors enabled:hover:border-accent/40 enabled:hover:bg-accent-soft enabled:hover:text-accent disabled:opacity-40"
            [disabled]="page() >= totalPages()"
            (click)="go(page() + 1)"
            aria-label="Página siguiente"
          ><fa-icon [icon]="faAngleRight" class="text-xs" /></button>
        </div>
      </div>
    }
  `,
})
export class PaginatorComponent {
  readonly faAngleLeft = faAngleLeft;
  readonly faAngleRight = faAngleRight;

  total    = input.required<number>();
  page     = input<number>(1);
  pageSize = input<number>(10);

  pageChange = output<number>();

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly start = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1));
  readonly end   = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  /** Ventana de páginas con elipsis (-1 = separador). */
  readonly pageList = computed<number[]>(() => {
    const tp = this.totalPages();
    const cur = this.page();
    if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1);

    const pages: number[] = [1];
    const from = Math.max(2, cur - 1);
    const to = Math.min(tp - 1, cur + 1);
    if (from > 2) pages.push(-1);
    for (let p = from; p <= to; p++) pages.push(p);
    if (to < tp - 1) pages.push(-1);
    pages.push(tp);
    return pages;
  });

  go(p: number): void {
    if (p >= 1 && p <= this.totalPages() && p !== this.page()) {
      this.pageChange.emit(p);
    }
  }
}
