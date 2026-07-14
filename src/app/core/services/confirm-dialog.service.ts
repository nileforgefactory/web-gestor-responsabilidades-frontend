import { Injectable, signal } from '@angular/core';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly config = signal<ConfirmDialogConfig | null>(null);
  private resolveFn: ((value: boolean) => void) | null = null;

  confirm(config: ConfirmDialogConfig): Promise<boolean> {
    this.config.set(config);
    return new Promise<boolean>(resolve => {
      this.resolveFn = resolve;
    });
  }

  respond(value: boolean): void {
    this.config.set(null);
    this.resolveFn?.(value);
    this.resolveFn = null;
  }
}
